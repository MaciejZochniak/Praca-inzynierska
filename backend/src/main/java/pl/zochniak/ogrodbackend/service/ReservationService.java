package pl.zochniak.ogrodbackend.service;
import pl.zochniak.ogrodbackend.dto.request.ReservationRequest;
import pl.zochniak.ogrodbackend.dto.response.ReservationResponse;
import pl.zochniak.ogrodbackend.entity.*;
import pl.zochniak.ogrodbackend.entity.enums.PaymentStatus;
import pl.zochniak.ogrodbackend.entity.enums.ReservationStatus;
import pl.zochniak.ogrodbackend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
    
    @Transactional(readOnly = true)
    public List<ReservationResponse> getReservationsByUserId(Long userId) {
        return reservationsRepository.findByUserId(userId).stream()
                .map(r -> {
                    Item item = r.getItemId();
                    return ReservationResponse.builder()
                            .id(r.getId())
                            .reservationId(r.getId())
                            .itemId(item != null ? item.getId() : null)
                            .itemName(item != null ? item.getName() : "Zamówienie #" + r.getId())
                            .status(r.getStatus())
                            .startDate(r.getStartTime())
                            .endDate(r.getEndTime())
                            .totalPrice(r.getTotalPrice())
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public ReservationResponse createReservation(ReservationRequest request) {
        if (request.getStartDate() == null || request.getEndDate() == null ||
                !request.getEndDate().isAfter(request.getStartDate())) {
            throw new IllegalArgumentException("ERROR: Data zakończenia musi być późniejsza niż data rozpoczęcia");
        }

        Item item = itemRepository.findByIdWithLock(request.getItemId())
                .orElseThrow(() -> new IllegalArgumentException("ERROR: Nie znaleziono sprzętu o ID: " + request.getItemId()));

        if (Boolean.FALSE.equals(item.getIsAvailable())) {
            throw new IllegalArgumentException("ERROR: Wybrany sprzęt jest niedostępny");
        }

        List<Reservations> conflicts = reservationsRepository.findConflictingReservations(
                item.getId(),
                request.getStartDate(),
                request.getEndDate()
        );

        if (!conflicts.isEmpty()) {
            throw new IllegalStateException("ERROR: Wybrany termin jest zajęty");
        }

        long days = Duration.between(request.getStartDate(), request.getEndDate()).toDays();
        if (days <= 0) {
            days = 1;
        }
        BigDecimal totalCost = item.getPrice().multiply(BigDecimal.valueOf(days));

        User user = null;
        if (request.getUserId() != null) {
            user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new IllegalArgumentException("ERROR: Nie znaleziono użytkownika"));
        } else {
            if (request.getGuestName() == null || request.getGuestEmail() == null || request.getGuestPhone() == null) {
                throw new IllegalArgumentException("ERROR: Dla rezerwacji bez konta wymagane są dane gościa");
            }
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

        Reservations_items itemDetail = Reservations_items.builder()
                .reservation(reservation)
                .item(item)
                .quantity(1)
                .unitPrice(item.getPrice())
                .build();

        reservation.getReservationItems().add(itemDetail);
        Reservations savedReservation = reservationsRepository.save(reservation);

        if (request.getDeliveryType() != null) {
            Delivery delivery = Delivery.builder()
                    .reservation(savedReservation)
                    .deliveryType(request.getDeliveryType())
                    .street(request.getStreet())
                    .city(request.getCity())
                    .postalCode(request.getPostalCode())
                    .cost(BigDecimal.ZERO)
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

        return ReservationResponse.builder()
                .id(savedReservation.getId())
                .reservationId(savedReservation.getId())
                .itemId(item.getId())
                .itemName(item.getName())
                .status(savedReservation.getStatus())
                .startDate(savedReservation.getStartTime())
                .endDate(savedReservation.getEndTime())
                .totalPrice(savedReservation.getTotalPrice())
                .message("Sukces: Rezerwacja została utworzona. ID rezerwacji: " + savedReservation.getId())
                .build();
        
    }
    public List<Reservations> getActiveReservationsForItem(Long itemId) {
        return reservationsRepository.findActiveByItemId(itemId);
    }
}