#!/bin/bash
# ═══════════════════════════════════════════════════
#  EcoMove API — Azure Container Apps Setup
#  Ejecuta esto una sola vez para crear la infra
# ═══════════════════════════════════════════════════

set -e

# --- Variables (cambia si quieres) ---
RESOURCE_GROUP="ecomove-rg"
LOCATION="eastus2"
ACR_NAME="ecomoveacr"
ENV_NAME="ecomove-env"
APP_NAME="ecomove-api"
IMAGE_NAME="ecomove-api"

echo "═══ 1. Instalando extensiones de Azure CLI ═══"
az extension add --name containerapp --upgrade -y 2>/dev/null || true
az provider register --namespace Microsoft.App --wait 2>/dev/null || true
az provider register --namespace Microsoft.OperationalInsights --wait 2>/dev/null || true

echo "═══ 2. Creando Resource Group ═══"
az group create --name $RESOURCE_GROUP --location $LOCATION

echo "═══ 3. Creando Azure Container Registry ═══"
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled true

echo "═══ 4. Build + Push de la imagen ═══"
az acr build --registry $ACR_NAME --image $IMAGE_NAME:latest .

echo "═══ 5. Creando Container Apps Environment ═══"
az containerapp env create \
  --name $ENV_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

echo "═══ 6. Obteniendo credenciales del ACR ═══"
ACR_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
ACR_USER=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASS=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

echo "═══ 7. Creando Container App ═══"
az containerapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ENV_NAME \
  --image "$ACR_SERVER/$IMAGE_NAME:latest" \
  --registry-server $ACR_SERVER \
  --registry-username $ACR_USER \
  --registry-password $ACR_PASS \
  --target-port 3001 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars \
    "DATABASE_URL=postgresql://neondb_owner:npg_4nNkAy0rjbFp@ep-icy-firefly-a8wnrh23-pooler.eastus2.azure.neon.tech/neondb?sslmode=require" \
    "JWT_SECRET=ecomove_jwt_secret_2024_prod" \
    "PORT=3001"

echo ""
echo "═══ DEPLOY COMPLETO ═══"
echo ""
APP_URL=$(az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv)
echo "  API URL: https://$APP_URL"
echo "  Health:  https://$APP_URL/api/health"
echo ""
echo "  Usa esta URL en tu app React Native:"
echo "  const BASE = 'https://$APP_URL/api'"
echo ""
echo "═══════════════════════════════════════════════"
