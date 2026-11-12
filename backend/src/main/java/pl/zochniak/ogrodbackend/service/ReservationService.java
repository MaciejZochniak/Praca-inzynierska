package pl.zochniak.ogrodbackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.zochniak.ogrodbackend.dto.request.ReservationRequest;
import pl.zochniak.ogrodbackend.dto.response.ReservationResponse;
import pl.zochniak.ogrodbackend.entity.*;
import pl.zochniak.ogrodbackend.entity.enums.DeliveryType;
import pl.zochniak.ogrodbackend.entity.enums.PaymentStatus;
import pl.zochniak.ogrodbackend.entity.enums.ReservationStatus;
import pl.zochniak.ogrodbackend.repository.*;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationsRepository reservationsRepository;
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private final DeliveryRepository deliveryRepository;
    private final PaymentsRepository paymentsRepository;

    private ReservationResponse mapToResponse(Reservations r) {
        Item item = r.getItemId();
        String clientName = r.getUser() != null
                ? (r.getUser().getFirstName() + " " + r.getUser().getLastName()).trim()
                : (r.getGuestName() != null ? r.getGuestName() : "Klient");
        String clientPhone = r.getUser() != null
                ? r.getUser().getPhoneNumber()
                : r.getGuestPhone();

        String address = "Odbiór osobisty w punkcie";
        DeliveryType delType = DeliveryType.PICKUP;
        if (r.getDelivery() != null) {
            delType = r.getDelivery().getDeliveryType();
            if (delType == DeliveryType.DELIVERY) {
                String street = r.getDelivery().getStreet() != null ? r.getDelivery().getStreet() : "";
                String postal = r.getDelivery().getPostalCode() != null ? r.getDelivery().getPostalCode() : "";
                String city = r.getDelivery().getCity() != null ? r.getDelivery().getCity() : "";
                address = (street + ", " + postal + " " + city).replaceAll("^,\\s*", "").trim();
            }
        }

        return ReservationResponse.builder()
                .id(r.getId())
                .reservationId(r.getId())
                .itemId(item != null ? item.getId() : null)
                .itemName(item != null ? item.getName() : "Zamówienie #" + r.getId())
                .status(r.getStatus())
                .startDate(r.getStartTime())
                .endDate(r.getEndTime())
                .totalPrice(r.getTotalPrice())
                .deliveryType(delType)
                .paymentType(r.getPayment() != null ? r.getPayment().getPaymentType() : null)
                .clientName(clientName)
                .clientPhone(clientPhone)
                .deliveryAddress(address)
                .build();
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> getReservationsByUserId(Long userId) {
        return reservationsRepository.findByUserId(userId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // Grafik dla pracownika (wszystkie nieanulowane zlecenia lub przypisane do pracownika)
    @Transactional(readOnly = true)
    public List<ReservationResponse> getEmployeeSchedule(Long employeeId) {
        return reservationsRepository.findAll().stream()
                .filter(r -> r.getStatus() != ReservationStatus.CANCELLED)
                .filter(r -> r.getAssignedEmployee() == null || r.getAssignedEmployee().getId().equals(employeeId))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ReservationResponse updateReservationStatus(Long reservationId, ReservationStatus newStatus) {
        Reservations res = reservationsRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Nie znaleziono rezerwacji o ID: " + reservationId));
        res.setStatus(newStatus);
        return mapToResponse(reservationsRepository.save(res));
    }

    @Transactional(readOnly = true)
    public List<Reservations> getActiveReservationsForItem(Long itemId) {
        return reservationsRepository.findActiveByItemId(itemId);
    }

    @Transactional
    public ReservationResponse createReservation(ReservationRequest request) {
        if (request.getStartDate() == null || request.getEndDate() == null ||
                !request.getEndDate().isAfter(request.getStartDate())) {
            throw new IllegalArgumentException("Data zakończenia musi być późniejsza niż data rozpoczęcia.");
        }

        Item item = itemRepository.findByIdWithLock(request.getItemId())
                .orElseThrow(() -> new IllegalArgumentException("Nie znaleziono oferty o ID: " + request.getItemId()));

        if (Boolean.FALSE.equals(item.getIsAvailable())) {
            throw new IllegalArgumentException("Wybrana oferta jest obecnie niedostępna.");
        }

        List<Reservations> conflicts = reservationsRepository.findConflictingReservations(
                item.getId(),
                request.getStartDate(),
                request.getEndDate()
        );

        int availableQuantity = item.getQuantity() != null ? item.getQuantity() : 1;
        if (conflicts.size() >= availableQuantity) {
            throw new IllegalStateException("Wybrany termin jest już zajęty (brak wolnych sztuk/ekip).");
        }

        long days = Duration.between(request.getStartDate(), request.getEndDate()).toDays();
        if (days <= 0) {
            days = 1;
        }
        BigDecimal baseCost = item.getPrice().multiply(BigDecimal.valueOf(days));
        BigDecimal deliveryCost = (request.getDeliveryType() == DeliveryType.DELIVERY)
                ? BigDecimal.valueOf(50)
                : BigDecimal.ZERO;
        BigDecimal totalCost = baseCost.add(deliveryCost);

        User user = null;
        if (request.getUserId() != null) {
            user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new IllegalArgumentException("Nie znaleziono użytkownika."));
        } else if (request.getGuestName() == null || request.getGuestEmail() == null || request.getGuestPhone() == null) {
            throw new IllegalArgumentException("Wymagane są dane kontaktowe.");
        }

        Reservations reservation = Reservations.builder()
                .user(user)
                .guestName(request.getGuestName())
                .guestEmail(request.getGuestEmail())
                .guestPhone(request.getGuestPhone())
                .itemId(item)
                .startTime(request.getStartDate())
                .endTime(request.getEndDate())
                .status(ReservationStatus.PENDING)
                .totalPrice(totalCost)
                .build();

        Reservations savedReservation = reservationsRepository.save(reservation);

        if (request.getDeliveryType() != null) {
            Delivery delivery = Delivery.builder()
                    .reservation(savedReservation)
                    .deliveryType(request.getDeliveryType())
                    .street(request.getStreet())
                    .city(request.getCity())
                    .postalCode(request.getPostalCode())
                    .cost(deliveryCost)
                    .build();
            deliveryRepository.save(delivery);
        }

        if (request.getPaymentType() != null) {
            Payments payment = Payments.builder()
                    .reservation(savedReservation)
                    .paymentType(request.getPaymentType())
                    .amount(totalCost)
                    .status(PaymentStatus.PENDING)
                    .build();
            paymentsRepository.save(payment);
        }

        ReservationResponse response = mapToResponse(savedReservation);
        response.setMessage("Rezerwacja została utworzona.");
        return response;
    }
}