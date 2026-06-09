FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["RoadHelp.Api/RoadHelp.Api.csproj", "RoadHelp.Api/"]
COPY ["RoadHelp.Application/RoadHelp.Application.csproj", "RoadHelp.Application/"]
COPY ["RoadHelp.Infrastructure/RoadHelp.Infrastructure.csproj", "RoadHelp.Infrastructure/"]
COPY ["RoadHelp.Domain/RoadHelp.Domain.csproj", "RoadHelp.Domain/"]
RUN dotnet restore "RoadHelp.Api/RoadHelp.Api.csproj"
COPY . .
WORKDIR "/src/RoadHelp.Api"
RUN dotnet build "RoadHelp.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "RoadHelp.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENV ASPNETCORE_HTTP_PORTS=8080
ENTRYPOINT ["dotnet", "RoadHelp.Api.dll"]
