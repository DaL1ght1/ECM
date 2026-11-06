FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src src
RUN mvn -B -q -DskipTests package \
    && java -Djarmode=tools -jar target/ECM-*.jar extract --layers --launcher --destination extracted

FROM eclipse-temurin:17-jre
RUN groupadd --system ecm && useradd --system --gid ecm --uid 10001 ecm \
    && mkdir -p /data/blobs && chown ecm:ecm /data/blobs
WORKDIR /app
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./
USER ecm
ENV SERVER_PORT=8090 \
    ECM_STORAGE_ROOT=/data/blobs \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
EXPOSE 8090
VOLUME /data/blobs
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
    CMD bash -c 'exec 3<>/dev/tcp/127.0.0.1/8090 && printf "GET /actuator/health HTTP/1.0\r\nHost: localhost\r\n\r\n" >&3 && grep -q "\"UP\"" <&3'
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
