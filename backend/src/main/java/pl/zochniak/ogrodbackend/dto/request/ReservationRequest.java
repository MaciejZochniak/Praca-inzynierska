package pl.zochniak.ogrodbackend.dto.request;
import pl.zochniak.ogrodbackend.entity.enums.DeliveryType;
import pl.zochniak.ogrodbackend.entity.enums.PaymentType;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationRequest {

    private Long itemId;
    private LocalDateTime startDate;
    private LocalDateTime endDate;

    //id użytkownika (null jeśli rezerwacja -> GUEST)
    private Long userId;

    // Dane dla guest(wymagane, gdy userId == null)
    private String guestName;
    private String guestEmail;
    private String guestPhone;

    // Konfig dostawy
    private DeliveryType deliveryType;
    private String street;
    private String city;
    private String postalCode;

    //sposób płatności
    private PaymentType paymentMethod;
}