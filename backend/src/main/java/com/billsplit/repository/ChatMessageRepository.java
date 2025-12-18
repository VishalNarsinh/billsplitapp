package com.billsplit.repository;

import com.billsplit.model.ChatMessage;
import com.billsplit.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findBySenderAndRecipientOrRecipientAndSenderOrderByTimestampAsc(
            User sender1, User recipient1, User recipient2, User sender2);

    List<ChatMessage> findBySenderAndRecipientAndIsReadFalse(User sender, User recipient);
}
