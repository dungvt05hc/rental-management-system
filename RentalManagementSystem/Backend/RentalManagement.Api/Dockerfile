# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["RentalManagement.Api.csproj", "."]
RUN dotnet restore "RentalManagement.Api.csproj"

# Copy everything else and build
COPY . .
RUN dotnet build "RentalManagement.Api.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "RentalManagement.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
EXPOSE 10000

# Render requires the app to listen on PORT environment variable (default 10000)
ENV ASPNETCORE_URLS=http://0.0.0.0:10000
ENV PORT=10000

# Create logs directory
RUN mkdir -p /app/logs

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "RentalManagement.Api.dll"]
