# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["RentalManagement.Api/RentalManagement.Api.csproj", "RentalManagement.Api/"]
RUN dotnet restore "RentalManagement.Api/RentalManagement.Api.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/RentalManagement.Api"
RUN dotnet build "RentalManagement.Api.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "RentalManagement.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
EXPOSE 8080

# Cloud Run requires the app to listen on PORT environment variable
ENV ASPNETCORE_URLS=http://+:8080

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "RentalManagement.Api.dll"]
