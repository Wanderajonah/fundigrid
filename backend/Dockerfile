# Build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY FundiGrid.Api.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish FundiGrid.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Render injects PORT; Program.cs binds Kestrel to it. 8080 is the fallback
# for local `docker run` without an explicit PORT.
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
EXPOSE 8080

COPY --from=build /app/publish ./
USER $APP_UID

ENTRYPOINT ["dotnet", "FundiGrid.Api.dll"]
