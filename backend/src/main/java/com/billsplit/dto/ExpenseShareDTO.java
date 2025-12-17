package com.billsplit.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ExpenseShareDTO {
    private UserDTO user;
    private BigDecimal amount;
}
