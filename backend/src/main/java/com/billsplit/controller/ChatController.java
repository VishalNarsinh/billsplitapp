package com.billsplit.controller;

import com.billsplit.dto.ChatMessageDTO;
import com.billsplit.model.ChatMessage;
import com.billsplit.model.MessageType;
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
		String senderEmail = principal.getName();
		User sender = userRepository.findByEmail(senderEmail)
				.orElseThrow(() -> new RuntimeException("Sender not found"));

		User recipient = userRepository.findById(chatMessageDto.getRecipientId())
				.orElseThrow(() -> new RuntimeException("Recipient not found"));

		// 1. Handle Typing Events (Ephemeral, don't save to DB)
		if (chatMessageDto.getType() == MessageType.TYPING) {
			ChatMessageDTO typingDto = ChatMessageDTO.builder()
					.senderId(sender.getId())
					.recipientId(recipient.getId())
					.type(MessageType.TYPING)
					.timestamp(java.time.LocalDateTime.now())
					.build();
			messagingTemplate.convertAndSendToUser(recipient.getEmail(), "/queue/messages", typingDto);
			return;
		}
		ChatMessage chatMessage = ChatMessage.builder()
				.sender(sender)
				.recipient(recipient)
				.content(chatMessageDto.getContent())
				.isRead(false) // Default
				.build();

		ChatMessage savedMsg = chatMessageRepository.save(chatMessage);

		ChatMessageDTO responseDto = ChatMessageDTO.builder()
				.id(savedMsg.getId())
				.senderId(sender.getId())
				.senderName(sender.getName())
				.recipientId(recipient.getId())
				.content(savedMsg.getContent())
				.timestamp(savedMsg.getTimestamp())
				.isRead(false)
				.type(MessageType.CHAT)
				.build();

		messagingTemplate.convertAndSendToUser(recipient.getEmail(), "/queue/messages", responseDto);
		messagingTemplate.convertAndSendToUser(sender.getEmail(), "/queue/messages", responseDto);
	}

	@MessageMapping("/chat.read")
	public void markMessagesAsRead(@Payload ChatMessageDTO readDto, Principal principal) {
		// The user sending this request (principal) has read messages FROM 'senderId'
		// (in payload)
		String readerEmail = principal.getName();
		User reader = userRepository.findByEmail(readerEmail)
				.orElseThrow(() -> new RuntimeException("Reader not found"));

		Long originalSenderId = readDto.getRecipientId(); // Use recipientId field to carry the ID of the person whose
															// messages we read
		// Logic: Update all messages where sender = originalSenderId AND recipient =
		// reader AND isRead = false

		User originalSender = userRepository.findById(originalSenderId)
				.orElseThrow(() -> new RuntimeException("Original Sender not found"));

		List<ChatMessage> unreadMessages = chatMessageRepository.findBySenderAndRecipientAndIsReadFalse(originalSender,
				reader);

		if (!unreadMessages.isEmpty()) {
			unreadMessages.forEach(msg -> msg.setRead(true));
			chatMessageRepository.saveAll(unreadMessages);

			// Notify the Original Sender that their messages were read
			ChatMessageDTO receiptDto = ChatMessageDTO.builder()
					.senderId(reader.getId()) // Who read the message
					.recipientId(originalSender.getId())
					.type(MessageType.READ_RECEIPT)
					.build();

			messagingTemplate.convertAndSendToUser(originalSender.getEmail(), "/queue/messages", receiptDto);
		}
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
						currentUser, friend);

		List<ChatMessageDTO> dtos = messages.stream()
				.map(msg -> ChatMessageDTO.builder()
						.id(msg.getId())
						.senderId(msg.getSender().getId())
						.senderName(msg.getSender().getName())
						.recipientId(msg.getRecipient().getId())
						.content(msg.getContent())
						.timestamp(msg.getTimestamp())
						.isRead(msg.isRead())
						.type(MessageType.CHAT)
						.build())
				.collect(Collectors.toList());

		return ResponseEntity.ok(dtos);
	}
	// ... rest of controller

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
