FROM eclipse-temurin:21-jdk-alpine

WORKDIR /app

RUN apk add --no-cache dos2unix

COPY .mvn/ .mvn
COPY mvnw pom.xml ./

RUN dos2unix mvnw && chmod +x mvnw

RUN ./mvnw dependency:go-offline -B

COPY src ./src

EXPOSE 8080

CMD ["./mvnw", "spring-boot:run"]