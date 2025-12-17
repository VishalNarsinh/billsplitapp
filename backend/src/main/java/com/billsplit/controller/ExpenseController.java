package com.billsplit.controller;

import com.billsplit.dto.ExpenseDTO;
import com.billsplit.mapper.DtoMapper;
import com.billsplit.model.Expense;
import com.billsplit.service.BillSplitService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/expenses")
@CrossOrigin(origins = "*")
public class ExpenseController {
    private final com.billsplit.service.GroupService groupService;
    private final BillSplitService billSplitService;
    private final DtoMapper dtoMapper;

    public ExpenseController(com.billsplit.service.GroupService groupService, BillSplitService billSplitService,
            DtoMapper dtoMapper) {
        this.groupService = groupService;
        this.billSplitService = billSplitService;
        this.dtoMapper = dtoMapper;
    }

    @PostMapping
    public ResponseEntity<ExpenseDTO> createExpense(@RequestBody CreateExpenseRequest request) {
        Expense expense = billSplitService.createExpense(
                request.getGroupId(),
                request.getPayerId(),
                request.getDescription(),
                request.getTotalAmount(),
                request.getSplits(),
                request.getType());
        return ResponseEntity.ok(dtoMapper.toExpenseDTO(expense));
    }

    @PostMapping("/preview")
    public ResponseEntity<Map<Long, BigDecimal>> previewSplit(@RequestBody PreviewSplitRequest request) {
        return ResponseEntity
                .ok(billSplitService.calculateEqualSplit(request.getTotalAmount(), request.getParticipantIds()));
    }

    @GetMapping
    public ResponseEntity<List<ExpenseDTO>> getAllExpenses(
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        com.billsplit.model.User currentUser = groupService.getUserByEmail(userDetails.getUsername());
        List<Expense> expenses = billSplitService.getExpensesForUser(currentUser);

        return ResponseEntity.ok(expenses.stream()
                .map(dtoMapper::toExpenseDTO)
                .toList());
    }

    @Data
    static class CreateExpenseRequest {
        private Long groupId;
        private Long payerId;
        private String description;
        private BigDecimal totalAmount;
        private Map<Long, BigDecimal> splits; // UserId -> Amount
        private com.billsplit.model.ExpenseType type;
    }

    @Data
    static class PreviewSplitRequest {
        private BigDecimal totalAmount;
        private List<Long> participantIds;
    }
}
