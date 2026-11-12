package pl.zochniak.ogrodbackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.zochniak.ogrodbackend.dto.request.ReservationRequest;
import pl.zochniak.ogrodbackend.dto.response.ReservationResponse;
import pl.zochniak.ogrodbackend.entity.enums.ReservationStatus;
import pl.zochniak.ogrodbackend.service.ReservationService;

import java.util.List;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReservationController {

    private final ReservationService reservationService;

    @PostMapping
    public ResponseEntity<ReservationResponse> createReservation(@RequestBody ReservationRequest request) {
        ReservationResponse response = reservationService.createReservation(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ReservationResponse>> getUserReservations(@PathVariable Long userId) {
        return ResponseEntity.ok(reservationService.getReservationsByUserId(userId));
    }

    @GetMapping("/schedule/{employeeId}")
    public ResponseEntity<List<ReservationResponse>> getEmployeeSchedule(@PathVariable Long employeeId) {
        return ResponseEntity.ok(reservationService.getEmployeeSchedule(employeeId));
    }

    @PatchMapping("/{reservationId}/status")
    public ResponseEntity<ReservationResponse> updateStatus(
            @PathVariable Long reservationId,
            @RequestParam ReservationStatus status
    ) {
        return ResponseEntity.ok(reservationService.updateReservationStatus(reservationId, status));
    }

    @GetMapping("/item/{itemId}")
    public ResponseEntity<List<ReservationResponse>> getItemAvailability(@PathVariable Long itemId) {
        List<ReservationResponse> busySlots = reservationService.getActiveReservationsForItem(itemId)
                .stream()
                .map(r -> ReservationResponse.builder()
                        .reservationId(r.getId())
                        .startDate(r.getStartTime())
                        .endDate(r.getEndTime())
                        .status(r.getStatus())
                        .build())
                .toList();
        return ResponseEntity.ok(busySlots);
    }
}