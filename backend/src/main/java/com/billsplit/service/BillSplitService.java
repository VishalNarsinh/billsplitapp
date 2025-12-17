package com.billsplit.service;

import com.billsplit.mapper.DtoMapper;
import com.billsplit.model.*;
import com.billsplit.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BillSplitService {
    private final ExpenseRepository expenseRepository;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;

    private final DtoMapper dtoMapper; // Inject Mapper

    public BillSplitService(ExpenseRepository expenseRepository, GroupRepository groupRepository,
            UserRepository userRepository, com.billsplit.mapper.DtoMapper dtoMapper) {
        this.expenseRepository = expenseRepository;
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
        this.dtoMapper = dtoMapper;
    }

    @Transactional
    public Expense createExpense(Long groupId, Long payerId, String description, BigDecimal totalAmount,
            Map<Long, BigDecimal> exactSplits, ExpenseType type) {
        Group group = groupRepository.findById(groupId).orElseThrow(() -> new RuntimeException("Group not found"));
        User payer = userRepository.findById(payerId).orElseThrow(() -> new RuntimeException("Payer not found"));

        if (type == null)
            type = ExpenseType.EXPENSE;

        Expense expense = new Expense(description, totalAmount, payer, group, type);

        // Validation: Sum of splits must match total
        BigDecimal splitSum = exactSplits.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        // Allow slight tolerance? No, creation should be exact from frontend.
        if (splitSum.compareTo(totalAmount) != 0) {
            throw new IllegalArgumentException(
                    "Sum of splits (" + splitSum + ") does not equal total amount (" + totalAmount + ")");
        }

        List<ExpenseShare> shares = new ArrayList<>();
        for (Map.Entry<Long, BigDecimal> entry : exactSplits.entrySet()) {
            User user = userRepository.findById(entry.getKey())
                    .orElseThrow(() -> new RuntimeException("User not found: " + entry.getKey()));
            shares.add(new ExpenseShare(expense, user, entry.getValue()));
        }

        expense.setShares(shares);
        return expenseRepository.save(expense);
    }

    // Logic for frontend "preview" or default calculation
    public Map<Long, BigDecimal> calculateEqualSplit(BigDecimal totalAmount, List<Long> participantIds) {
        if (participantIds.isEmpty())
            return Collections.emptyMap();

        int count = participantIds.size();
        BigDecimal[] result = totalAmount.divideAndRemainder(BigDecimal.valueOf(count));
        BigDecimal base = result[0];
        BigDecimal remainder = result[1]; // e.g. 0.02

        // Distribute remainder cents to first N participants
        // This is a simple strategy. Google Pay style might just be random or
        // sequential.

        Map<Long, BigDecimal> splits = new HashMap<>();
        // Convert remainder to cents (integer)
        int cents = remainder.movePointRight(2).intValue();

        for (int i = 0; i < count; i++) {
            BigDecimal amount = base;
            if (i < cents) {
                amount = amount.add(new BigDecimal("0.01"));
            }
            splits.put(participantIds.get(i), amount);
        }
        return splits;
    }

    public List<Expense> getAllExpenses() {
        return expenseRepository.findAll();
    }

    public List<Expense> getExpensesForUser(User user) {
        List<Group> userGroups = groupRepository.findByMembersContaining(user);
        return expenseRepository.findByGroupIn(userGroups);
    }

    public List<com.billsplit.dto.BalanceDTO> calculateBalances(Long groupId) {
        List<Expense> expenses = expenseRepository.findByGroupId(groupId);
        Map<Long, BigDecimal> balances = new HashMap<>();

        // Initialize balances for all group members
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));
        for (User member : group.getMembers()) {
            balances.put(member.getId(), BigDecimal.ZERO);
        }

        for (Expense expense : expenses) {
            // Payer gets positive balance (they paid, so they are owed money)
            Long payerId = expense.getPayer().getId();
            balances.merge(payerId, expense.getTotalAmount(), BigDecimal::add);

            // Each share holder gets negative balance (they owe money)
            for (ExpenseShare share : expense.getShares()) {
                Long userId = share.getUser().getId();
                balances.merge(userId, share.getAmount().negate(), BigDecimal::add);
            }
        }

        return balances.entrySet().stream()
                .map(entry -> {
                    User user = userRepository.findById(entry.getKey()).orElse(null);
                    if (user == null)
                        return null;
                    return new com.billsplit.dto.BalanceDTO(
                            dtoMapper.toUserDTO(user),
                            entry.getValue().setScale(2, RoundingMode.HALF_UP).doubleValue());
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public List<com.billsplit.dto.DebtDTO> calculateDebts(Long groupId) {
        List<Expense> expenses = expenseRepository.findByGroupId(groupId);

        // Map to track net flow between pairs: user A -> user B : amount
        // Key string format: "minId-maxId" to represent the pair
        // We will store value relative to minId. Positive means minId owes maxId.
        // Negative means maxId owes minId.
        Map<String, BigDecimal> pairBalances = new HashMap<>();

        for (Expense expense : expenses) {
            Long payerId = expense.getPayer().getId();

            for (ExpenseShare share : expense.getShares()) {
                Long userId = share.getUser().getId();

                if (!payerId.equals(userId)) {
                    // userId owes payerId "amount"
                    // pair: userId and payerId
                    Long minId = Math.min(userId, payerId);
                    Long maxId = Math.max(userId, payerId);
                    String key = minId + "-" + maxId;

                    BigDecimal amount = share.getAmount();

                    // Logic: Net flow from minId to maxId
                    // If userId == minId, then minId owes maxId (payer). Add amount.
                    // If userId == maxId, then maxId owes minId (payer). Subtract amount.

                    BigDecimal currentParams = pairBalances.getOrDefault(key, BigDecimal.ZERO);

                    if (userId.equals(minId)) {
                        // minId owes maxId
                        pairBalances.put(key, currentParams.add(amount));
                    } else {
                        // maxId owes minId (which means minId is owed by maxId) -> negative flow
                        pairBalances.put(key, currentParams.subtract(amount));
                    }
                }
            }
        }

        // Convert map to DebtDTOs
        List<com.billsplit.dto.DebtDTO> debts = new ArrayList<>();

        for (Map.Entry<String, BigDecimal> entry : pairBalances.entrySet()) {
            BigDecimal balance = entry.getValue();
            if (balance.compareTo(BigDecimal.ZERO) == 0)
                continue;

            String[] ids = entry.getKey().split("-");
            Long id1 = Long.parseLong(ids[0]);
            Long id2 = Long.parseLong(ids[1]);

            User user1 = userRepository.findById(id1).orElse(null);
            User user2 = userRepository.findById(id2).orElse(null);

            if (user1 == null || user2 == null)
                continue;

            if (balance.compareTo(BigDecimal.ZERO) > 0) {
                // user1 (minId) owes user2 (maxId)
                debts.add(new com.billsplit.dto.DebtDTO(
                        dtoMapper.toUserDTO(user1),
                        dtoMapper.toUserDTO(user2),
                        balance.doubleValue()));
            } else {
                // negative balance means maxId (user2) owes minId (user1)
                debts.add(new com.billsplit.dto.DebtDTO(
                        dtoMapper.toUserDTO(user2),
                        dtoMapper.toUserDTO(user1),
                        balance.abs().doubleValue()));
            }
        }

        return debts;
    }
}
