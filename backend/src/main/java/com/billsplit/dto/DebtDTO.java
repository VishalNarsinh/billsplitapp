package com.billsplit.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DebtDTO {
    private UserDTO debtor;
    private UserDTO creditor;
    private Double amount;
}
