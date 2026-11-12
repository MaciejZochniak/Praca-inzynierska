package pl.zochniak.ogrodbackend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.zochniak.ogrodbackend.entity.enums.DeliveryType;
import pl.zochniak.ogrodbackend.entity.enums.PaymentType;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationRequest {

    private Long userId;
    private Long itemId;
    private LocalDateTime startDate;
    private LocalDateTime endDate;

    private String guestName;
    private String guestEmail;
    private String guestPhone;

    private DeliveryType deliveryType;
    private String street;
    private String city;
    private String postalCode;

    private PaymentType paymentType;
    private PaymentType paymentMethod;
    private String customerNotes;

    public PaymentType getPaymentType() {
        return this.paymentType != null ? this.paymentType : this.paymentMethod;
    }
}