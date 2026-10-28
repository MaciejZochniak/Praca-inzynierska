package pl.zochniak.ogrodbackend.service;
import pl.zochniak.ogrodbackend.dto.request.ReservationRequest;
import pl.zochniak.ogrodbackend.dto.response.ReservationResponse;
import pl.zochniak.ogrodbackend.entity.*;
import pl.zochniak.ogrodbackend.entity.enums.PaymentStatus;
import pl.zochniak.ogrodbackend.entity.enums.ReservationStatus;
import pl.zochniak.ogrodbackend.repository.*;
import lombok.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ItemRepository itemRepository;
    private final ReservationsRepository reservationsRepository;
    private final UserRepository userRepository;
    private final DeliveryRepository deliveryRepository;
    private final PaymentsRepository paymentsRepository;

    @Transactional
    public ReservationResponse createReservation(ReservationRequest request) {

        // Walidacja poprawności dat
        if (request.getStartDate() == null || request.getEndDate() == null) {
            throw new IllegalArgumentException("ERROR: Daty rozpoczęcia i zakończenia są wymagane.");
        }
        if (!request.getStartDate().isBefore(request.getEndDate())) {
            throw new IllegalArgumentException("ERROR: Data rozpoczęcia musi być przed datą zakończenia.");
        }

        //Blokada
        Item item = itemRepository.findByIdWithLock(request.getItemId())
                .orElseThrow(() -> new IllegalArgumentException("Nie ma sprzętu ID: " + request.getItemId()));

        if (Boolean.FALSE.equals(item.getIsAvailable())) {
            throw new IllegalStateException("ERROR: Sprzęt jest poza użytkowaniem.");
        }

        //walidacja kolizji terminów
        List<Reservations> conflicts = reservationsRepository.findConflictingReservations(
                item.getId(),
                request.getStartDate(),
                request.getEndDate()
        );
        if (!conflicts.isEmpty()) {
            throw new IllegalStateException("ERROR: Wybrany termin jest zajęty");
        }

        //Przypisanie klienta lub goscia
        User user = null;
        if (request.getUserId() != null) {
            user = userRepository.findById(request.getUserId()).orElseThrow(() -> new IllegalArgumentException("Nie znaleziono użytkownika ID: " + request.getUserId()));
        } else {
            if (request.getGuestEmail() == null || request.getGuestPhone() == null) {
                throw new IllegalArgumentException("ERROR: Dane gościa są wymagane.");
            }
        }

        //Kalkulacja kosztów rezerwacji
        long days = Math.max(1, Duration.between(request.getStartDate(), request.getEndDate()).toDays());
        BigDecimal totalCost = item.getPrice().multiply(BigDecimal.valueOf(days));

        //utworzenie i zapis encji Reservations
        Reservations reservation = Reservations.builder()
                .user(user)
                .guestName(request.getGuestName())
                .guestEmail(request.getGuestEmail())
                .guestPhone(request.getGuestPhone())
                .startTime(request.getStartDate())
                .endTime(request.getEndDate())
                .status(ReservationStatus.PENDING)
                .totalPrice(totalCost)
                .build();

        //utworzenie rezerwacji
        Reservations_items itemDetail = Reservations_items.builder()
                .reservation(reservation)
                .item(item)
                .quantity(1)
                .price(item.getPrice())
                .build();

        reservation.getReservationItems().add(itemDetail);
        Reservations savedReservation = reservationsRepository.save(reservation);

        //ustawienie konfiguracji dostawy
        if (request.getDeliveryType() != null) {
            Delivery delivery = Delivery.builder()
                    .reservation(savedReservation)
                    .deliveryType(request.getDeliveryType())
                    .street(request.getStreet())
                    .city(request.getCity())
                    .postalCode(request.getPostalCode())
                    .deliveryCost(BigDecimal.ZERO)
                    .build();
            deliveryRepository.save(delivery);
        }

        //inicjalizacja płatności
        if (request.getPaymentMethod() != null){
            Payments payment = Payments.builder()
                    .reservation(savedReservation)
                    .paymentMethod(request.getPaymentMethod())
                    .amount(totalCost)
                    .status(PaymentStatus.PENDING)
                    .build();
            paymentsRepository.save(payment);
        }
        return ReservationResponse.builder()
                .reservationId(savedReservation.getId())
                .status(savedReservation.getStatus())
                .startDate(savedReservation.getStartTime())
                .endDate(savedReservation.getEndTime())
                .totalPrice(savedReservation.getTotalPrice())
                .message("Sukces: Rezerwacja została utworzona. ID rezerwacji: " + savedReservation.getId())
                .build();
    }
}