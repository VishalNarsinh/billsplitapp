package com.billsplit.controller;

import com.billsplit.dto.ChatMessageDTO;
import com.billsplit.model.ChatMessage;
import com.billsplit.model.User;
import com.billsplit.repository.ChatMessageRepository;
import com.billsplit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.user.SimpUser;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Controller
@RequiredArgsConstructor
@RequestMapping("/api")

public class ChatController {

	private final SimpMessagingTemplate messagingTemplate;
	private final SimpUserRegistry simpUserRegistry;
	private final ChatMessageRepository chatMessageRepository;
	private final UserRepository userRepository;

	@MessageMapping("/chat.private")
	public void processMessage(@Payload ChatMessageDTO chatMessageDto, Principal principal) {
		// Principal name is the email/username from JWT
		String senderEmail = principal.getName();
		User sender = userRepository.findByEmail(senderEmail)
				.orElseThrow(() -> new RuntimeException("Sender not found"));

		User recipient = userRepository.findById(chatMessageDto.getRecipientId())
				.orElseThrow(() -> new RuntimeException("Recipient not found"));

		ChatMessage chatMessage = ChatMessage.builder().sender(sender).recipient(recipient)
				.content(chatMessageDto.getContent()).build();

		// Save to DB
		ChatMessage savedMsg = chatMessageRepository.save(chatMessage);

		ChatMessageDTO responseDto = ChatMessageDTO.builder()
				.id(savedMsg.getId())
				.senderId(sender.getId())
				.senderName(sender.getName())
				.recipientId(recipient.getId())
				.content(savedMsg.getContent())
				.timestamp(savedMsg.getTimestamp())
				.build();

		// Send to Recipient's User Queue
		String recipientEmail = recipient.getEmail().toLowerCase().trim();

		messagingTemplate.convertAndSendToUser(recipientEmail, "/queue/messages", responseDto);

		// Also send back to Sender so they see it confirmed (optional, can just append
		// locally)
		messagingTemplate.convertAndSendToUser(sender.getEmail(), "/queue/messages", responseDto);
	}

	@GetMapping("/messages/{friendId}")
	public ResponseEntity<List<ChatMessageDTO>> findChatMessages(@PathVariable Long friendId) {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		String currentUserEmail = authentication.getName();
		User currentUser = userRepository.findByEmail(currentUserEmail)
				.orElseThrow(() -> new RuntimeException("User not found"));

		User friend = userRepository.findById(friendId).orElseThrow(() -> new RuntimeException("Friend not found"));

		List<ChatMessage> messages = chatMessageRepository
				.findBySenderAndRecipientOrRecipientAndSenderOrderByTimestampAsc(currentUser, friend,
						currentUser, friend); // Order matters in query: (A, B) OR (A, B) is wrong. Needs (A, B) OR (B,
		// A).
		// Correct logic: (sender=Me AND recipient=Friend) OR (recipient=Me AND
		// sender=Friend)

		// Fixed repository call logic in standard JPA style above is actually tricky
		// with positional params inferred.
		// Let's rely on the method naming convention:
		// findBySenderAndRecipientOrRecipientAndSenderOrderByTimestampAsc(s1,r1,r2,s2)
		// matches: (sender=s1 AND recipient=r1) OR (recipient=r2 AND sender=s2)

		List<ChatMessageDTO> dtos = messages.stream()
				.map(msg -> ChatMessageDTO.builder()
						.id(msg.getId())
						.senderId(msg.getSender().getId())
						.senderName(msg.getSender().getName())
						.recipientId(msg.getRecipient().getId())
						.content(msg.getContent())
						.timestamp(msg.getTimestamp())
						.build())
				.collect(Collectors.toList());

		return ResponseEntity.ok(dtos);
	}

	@GetMapping("/chat/recent-contacts")
	public ResponseEntity<List<User>> getRecentContacts(Principal principal) {
		String email = principal.getName();
		User currentUser = userRepository.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("User not found"));

		List<User> recentContacts = userRepository.findRecentChatPartners(currentUser.getId());
		return ResponseEntity.ok(recentContacts);
	}

	@GetMapping("/chat/online-users")
	public ResponseEntity<List<String>> getOnlineUsers() {
		List<String> onlineEmails = simpUserRegistry.getUsers().stream()
				.map(SimpUser::getName)
				.collect(Collectors.toList());
		return ResponseEntity.ok(onlineEmails);
	}
}
