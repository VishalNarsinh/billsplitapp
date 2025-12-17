package com.billsplit.controller;

import com.billsplit.dto.UserDTO;
import com.billsplit.payload.AuthPayloads;
import com.billsplit.security.AuthService;
import com.billsplit.security.JwtService;
import com.billsplit.service.GroupService;
import com.billsplit.mapper.DtoMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;
    private final GroupService groupService; // For /me logic if needed directly or via security context
    private final JwtService jwtService;
    private final DtoMapper dtoMapper;

    @PostMapping("/register")
    public ResponseEntity<AuthPayloads.AuthResponse> register(@RequestBody AuthPayloads.RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthPayloads.AuthResponse> authenticate(@RequestBody AuthPayloads.LoginRequest request) {
        return ResponseEntity.ok(authService.authenticate(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthPayloads.AuthResponse> refresh(@RequestBody AuthPayloads.RefreshRequest request) {
        return ResponseEntity.ok(authService.refreshToken(request.getRefreshToken()));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser(HttpServletRequest request) {
        // Extract token from header
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String jwt = authHeader.substring(7);
            String email = jwtService.extractUsername(jwt);
            // In a real app, use SecurityContextHolder
            // But fetching fresh user is safer
            return ResponseEntity.ok(dtoMapper.toUserDTO(groupService.getUserByEmail(email)));
        }
        return ResponseEntity.status(401).build();
    }
}
