package com.billsplit.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ExpenseDTO {
    private Long id;
    private String description;
    private BigDecimal totalAmount;
    private LocalDateTime date;
    private UserDTO payer;
    private Long groupId;
    private List<ExpenseShareDTO> shares;
    private com.billsplit.model.ExpenseType type;
}
