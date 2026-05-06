# Stage 1: build the React frontend
FROM node:20-alpine AS ui-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python / Django runtime + static files
FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY manage.py ./
COPY slbpricer_project/ ./slbpricer_project/
COPY pricer/ ./pricer/
COPY --from=ui-build /app/static ./static/

ENV PYTHONPATH=/app
ENV DJANGO_SETTINGS_MODULE=slbpricer_project.settings
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
