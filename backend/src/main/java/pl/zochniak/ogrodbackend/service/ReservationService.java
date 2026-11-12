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
import pl.zochniak.ogrodbackend.entity.enums.Role;
import pl.zochniak.ogrodbackend.repository.*;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
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

    private boolean isServiceItem(Item item) {
        if (item == null) return false;
        Long catId = item.getCategory() != null ? item.getCategory().getId() : 0L;
        String name = item.getName() != null ? item.getName().toLowerCase() : "";
        return catId >= 10 || name.startsWith("usługa");
    }

    private ReservationResponse mapToResponse(Reservations r) {
        Item item = r.getItemId();
        String clientName = r.getUser() != null
                ? (r.getUser().getFirstName() + " " + r.getUser().getLastName()).trim()
                : (r.getGuestName() != null ? r.getGuestName() : "Klient");
        String clientPhone = r.getUser() != null && r.getUser().getPhoneNumber() != null
                ? r.getUser().getPhoneNumber()
                : r.getGuestPhone();
        String clientEmail = r.getUser() != null
                ? r.getUser().getEmail()
                : r.getGuestEmail();

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
                .clientEmail(clientEmail)
                .deliveryAddress(address)
                .customerNotes(r.getCustomerNotes())
                .build();
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> getReservationsByUserId(Long userId) {
        return reservationsRepository.findByUserId(userId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> getEmployeeSchedule(Long employeeId) {
        return reservationsRepository.findScheduleForEmployee(employeeId).stream()
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

    // Zatwierdzenie szczegółów konsultacji przez pracownika:
    // 1. Konsultacja zmienia status na COMPLETED
    // 2. Tworzy się właściwa usługa do realizacji z datą od momentu zakończenia konsultacji
    @Transactional
    public ReservationResponse completeConsultationAndScheduleService(
            Long consultationId,
            BigDecimal agreedPrice,
            String estimatedDuration,
            String details
    ) {
        Reservations consultation = reservationsRepository.findById(consultationId)
                .orElseThrow(() -> new IllegalArgumentException("Nie znaleziono konsultacji o ID: " + consultationId));

        LocalDateTime now = LocalDateTime.now();

        // 1. Oznacz konsultację jako zakończoną
        consultation.setStatus(ReservationStatus.COMPLETED);
        consultation.setEndTime(now);
        String oldNotes = consultation.getCustomerNotes() != null ? consultation.getCustomerNotes() : "";
        consultation.setCustomerNotes(
                (oldNotes + " | Ustalono kwotę: " + agreedPrice + " zł, czas: " + estimatedDuration).trim()
        );
        reservationsRepository.save(consultation);

        // 2. Utwórz właściwą usługę do realizacji od teraz
        String serviceNotes = "REALIZACJA USŁUGI | Szacowany czas: " + estimatedDuration
                + (details != null && !details.isBlank() ? " | Ustalenia: " + details : "")
                + (!oldNotes.isBlank() ? " | (" + oldNotes + ")" : "");

        Reservations serviceTask = Reservations.builder()
                .user(consultation.getUser())
                .assignedEmployee(consultation.getAssignedEmployee())
                .guestName(consultation.getGuestName())
                .guestEmail(consultation.getGuestEmail())
                .guestPhone(consultation.getGuestPhone())
                .itemId(consultation.getItemId())
                .startTime(now)
                .endTime(now.plusHours(8))
                .status(ReservationStatus.CONFIRMED)
                .totalPrice(agreedPrice != null ? agreedPrice : consultation.getTotalPrice())
                .customerNotes(serviceNotes)
                .build();

        Reservations savedTask = reservationsRepository.save(serviceTask);

        if (consultation.getDelivery() != null) {
            Delivery del = Delivery.builder()
                    .reservation(savedTask)
                    .deliveryType(DeliveryType.DELIVERY)
                    .street(consultation.getDelivery().getStreet())
                    .city(consultation.getDelivery().getCity())
                    .postalCode(consultation.getDelivery().getPostalCode())
                    .cost(BigDecimal.ZERO)
                    .build();
            Delivery savedDel = deliveryRepository.save(del);
            savedTask.setDelivery(savedDel);
        }

        return mapToResponse(savedTask);
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

        boolean service = isServiceItem(item);

        // Dla sprzętu sprawdzamy dostępność sztuk; dla konsultacji usługowych sprawdzamy wolnych pracowników
        if (!service) {
            List<Reservations> conflicts = reservationsRepository.findConflictingReservations(
                    item.getId(),
                    request.getStartDate(),
                    request.getEndDate()
            );
            int availableQuantity = item.getQuantity() != null ? item.getQuantity() : 1;
            if (conflicts.size() >= availableQuantity) {
                throw new IllegalStateException("Wybrany termin jest już zajęty (brak wolnych sztuk).");
            }
        }

        // Przydział pracownika (2 pierwszych od usług/konsultacji, 3. od sprzętu)
        List<User> employees = userRepository.findByRoleOrderByIdAsc(Role.EMPLOYEE);
        User assignedEmployee = null;

        if (!employees.isEmpty()) {
            if (service) {
                int serviceWorkersCount = Math.min(2, employees.size());
                LocalDateTime dayStart = request.getStartDate().toLocalDate().atStartOfDay();
                LocalDateTime dayEnd = request.getEndDate().toLocalDate().atTime(23, 59, 59);

                for (int i = 0; i < serviceWorkersCount; i++) {
                    User candidate = employees.get(i);
                    List<Reservations> empConflicts = reservationsRepository.findEmployeeConflicts(
                            candidate.getId(), dayStart, dayEnd
                    );
                    if (empConflicts.isEmpty()) {
                        assignedEmployee = candidate;
                        break;
                    }
                }

                if (assignedEmployee == null) {
                    throw new IllegalStateException("Brak wolnego specjalisty w wybranym dniu. Wybierz inny termin konsultacji.");
                }
            } else {
                assignedEmployee = employees.get(employees.size() >= 3 ? 2 : employees.size() - 1);
            }
        }

        long days = Duration.between(request.getStartDate(), request.getEndDate()).toDays();
        if (days <= 0) {
            days = 1;
        }
        BigDecimal baseCost = item.getPrice().multiply(BigDecimal.valueOf(days));
        BigDecimal deliveryCost = (!service && request.getDeliveryType() == DeliveryType.DELIVERY)
                ? BigDecimal.valueOf(50)
                : BigDecimal.ZERO;
        BigDecimal totalCost = baseCost.add(deliveryCost);

        User user = null;
        if (request.getUserId() != null) {
            user = userRepository.findById(request.getUserId()).orElse(null);
        }
        if (user == null && (request.getGuestName() == null || request.getGuestEmail() == null || request.getGuestPhone() == null)) {
            throw new IllegalArgumentException("Wymagane są dane kontaktowe.");
        }

        String notes = request.getCustomerNotes();
        if (service && (notes == null || !notes.startsWith("KONSULTACJA"))) {
            notes = "KONSULTACJA TELEFONICZNA" + (notes != null && !notes.isBlank() ? " | " + notes : "");
        }

        Reservations reservation = Reservations.builder()
                .user(user)
                .assignedEmployee(assignedEmployee)
                .guestName(request.getGuestName())
                .guestEmail(request.getGuestEmail())
                .guestPhone(request.getGuestPhone())
                .itemId(item)
                .startTime(request.getStartDate())
                .endTime(request.getEndDate())
                .status(ReservationStatus.PENDING)
                .totalPrice(totalCost)
                .customerNotes(notes)
                .build();

        Reservations savedReservation = reservationsRepository.save(reservation);

        DeliveryType effectiveDeliveryType = request.getDeliveryType() != null
                ? request.getDeliveryType()
                : (service ? DeliveryType.DELIVERY : DeliveryType.PICKUP);

        Delivery delivery = Delivery.builder()
                .reservation(savedReservation)
                .deliveryType(effectiveDeliveryType)
                .street(request.getStreet() != null ? request.getStreet() : "")
                .city(request.getCity() != null ? request.getCity() : "")
                .postalCode(request.getPostalCode() != null ? request.getPostalCode() : "")
                .cost(deliveryCost)
                .build();
        Delivery savedDelivery = deliveryRepository.save(delivery);
        savedReservation.setDelivery(savedDelivery);

        if (!service && request.getPaymentType() != null) {
            Payments payment = Payments.builder()
                    .reservation(savedReservation)
                    .paymentType(request.getPaymentType())
                    .amount(totalCost)
                    .status(PaymentStatus.PENDING)
                    .build();
            Payments savedPayment = paymentsRepository.save(payment);
            savedReservation.setPayment(savedPayment);
        }

        ReservationResponse response = mapToResponse(savedReservation);
        response.setMessage(service
                ? "Zgłoszenie konsultacji telefonicznej zostało przyjęte."
                : "Rezerwacja została utworzona.");
        return response;
    }
}