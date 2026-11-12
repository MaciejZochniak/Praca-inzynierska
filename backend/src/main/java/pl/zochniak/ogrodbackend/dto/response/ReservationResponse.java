package pl.zochniak.ogrodbackend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.zochniak.ogrodbackend.entity.enums.DeliveryType;
import pl.zochniak.ogrodbackend.entity.enums.PaymentType;
import pl.zochniak.ogrodbackend.entity.enums.ReservationStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationResponse {
    private Long id;
    private Long reservationId;
    private Long itemId;
    private String itemName;
    private ReservationStatus status;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private BigDecimal totalPrice;
    private DeliveryType deliveryType;
    private PaymentType paymentType;
    private String clientName;
    private String clientPhone;
    private String deliveryAddress;
    private String message;
}