package com.billsplit.repository;

import com.billsplit.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    // Search for users
    List<User> findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(String name, String email);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT u FROM User u WHERE u.id IN (SELECT m.sender.id FROM ChatMessage m WHERE m.recipient.id = :userId) OR u.id IN (SELECT m.recipient.id FROM ChatMessage m WHERE m.sender.id = :userId)")
    List<User> findRecentChatPartners(Long userId);
}
