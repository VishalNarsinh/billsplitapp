package com.billsplit.mapper;

import com.billsplit.dto.*;
import com.billsplit.model.*;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class DtoMapper {

    public UserDTO toUserDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        return dto;
    }

    public GroupDTO toGroupDTO(Group group) {
        GroupDTO dto = new GroupDTO();
        dto.setId(group.getId());
        dto.setName(group.getName());
        dto.setMembers(group.getMembers().stream()
                .map(this::toUserDTO)
                .collect(Collectors.toList()));
        return dto;
    }

    public ExpenseShareDTO toExpenseShareDTO(ExpenseShare share) {
        ExpenseShareDTO dto = new ExpenseShareDTO();
        dto.setUser(toUserDTO(share.getUser()));
        dto.setAmount(share.getAmount());
        return dto;
    }

    public ExpenseDTO toExpenseDTO(Expense expense) {
        ExpenseDTO dto = new ExpenseDTO();
        dto.setId(expense.getId());
        dto.setDescription(expense.getDescription());
        dto.setTotalAmount(expense.getTotalAmount());
        dto.setDate(expense.getDate());
        dto.setPayer(toUserDTO(expense.getPayer()));
        dto.setGroupId(expense.getGroup().getId());
        dto.setShares(expense.getShares().stream()
                .map(this::toExpenseShareDTO)
                .collect(Collectors.toList()));
        return dto;
    }
}
