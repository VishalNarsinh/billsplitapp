package com.billsplit.controller;

import com.billsplit.dto.UserDTO;
import com.billsplit.mapper.DtoMapper;
import com.billsplit.model.FriendRequest;
import com.billsplit.model.User;
import com.billsplit.repository.UserRepository;
import com.billsplit.service.FriendService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class FriendController {

    private final FriendService friendService;
    private final UserRepository userRepository;
    private final DtoMapper dtoMapper;

    public FriendController(FriendService friendService, UserRepository userRepository, DtoMapper dtoMapper) {
        this.friendService = friendService;
        this.userRepository = userRepository;
        this.dtoMapper = dtoMapper;
    }

    @GetMapping("/users/search")
    public ResponseEntity<List<UserDTO>> searchUsers(@RequestParam String query,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<User> results = friendService.searchUsers(query, currentUser);
        return ResponseEntity.ok(results.stream().map(dtoMapper::toUserDTO).collect(Collectors.toList()));
    }

    @PostMapping("/friends/request/{receiverId}")
    public ResponseEntity<?> sendRequest(@PathVariable Long receiverId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        friendService.sendFriendRequest(currentUser, receiverId);
        return ResponseEntity.ok("Friend request sent");
    }

    @GetMapping("/friends/requests")
    public ResponseEntity<List<FriendRequestDTO>> getPendingRequests(@AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<FriendRequest> requests = friendService.getPendingRequests(currentUser);
        return ResponseEntity.ok(requests.stream()
                .map(req -> new FriendRequestDTO(req.getId(), dtoMapper.toUserDTO(req.getSender()),
                        req.getStatus().name()))
                .collect(Collectors.toList()));
    }

    @GetMapping("/friends/sent-requests")
    public ResponseEntity<List<FriendRequestDTO>> getSentRequests(@AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<FriendRequest> requests = friendService.getSentRequests(currentUser);
        return ResponseEntity.ok(requests.stream()
                .map(req -> new FriendRequestDTO(req.getId(), dtoMapper.toUserDTO(req.getReceiver()), // Note: We return
                                                                                                      // Receiver for
                                                                                                      // sent requests
                        req.getStatus().name()))
                .collect(Collectors.toList()));
    }

    @PostMapping("/friends/requests/{requestId}/accept")
    public ResponseEntity<?> acceptRequest(@PathVariable Long requestId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        friendService.acceptRequest(currentUser, requestId);
        return ResponseEntity.ok("Friend request accepted");
    }

    @PostMapping("/friends/requests/{requestId}/reject")
    public ResponseEntity<?> rejectRequest(@PathVariable Long requestId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        friendService.rejectRequest(currentUser, requestId);
        return ResponseEntity.ok("Friend request rejected");
    }

    @GetMapping("/friends")
    public ResponseEntity<List<UserDTO>> getFriends(@AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<User> friends = friendService.getFriends(currentUser);
        return ResponseEntity.ok(friends.stream().map(dtoMapper::toUserDTO).collect(Collectors.toList()));
    }

    @Data
    static class FriendRequestDTO {
        private Long id;
        private UserDTO sender;
        private String status;

        public FriendRequestDTO(Long id, UserDTO sender, String status) {
            this.id = id;
            this.sender = sender;
            this.status = status;
        }
    }
}
