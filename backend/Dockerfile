FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml ./
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build --chown=10001:10001 /build/target/smartpricing-0.0.1-SNAPSHOT.jar /app/app.jar
USER 10001:10001
ENV SPRING_PROFILES_ACTIVE=demo,portfolio,neon,cloud
EXPOSE 10000
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=55.0", "-XX:MaxMetaspaceSize=128m", "-XX:ReservedCodeCacheSize=32m", "-jar", "/app/app.jar"]
