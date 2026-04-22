
# Allure Docker Service 3

Сервис для генерации Allure 3 отчетов с поддержкой плагинов.

## Быстрый старт

### Docker Compose

```bash
docker-compose build
docker-compose up -d
```

Или одной командой:

```bash
docker-compose up -d --build
```

Сервис доступен: <http://localhost:3000>

### Локальный запуск

```bash
npm install
npm run build
npm run start:prod
```

## Переменные окружения

| Переменная | По умолчанию | Описание |
| ------------ | -------------- | ---------- |
| `PORT` | 3000 | Порт сервера |
| `DATA_PATH` | ./data | Директория данных проектов |
| `GENERATION_TIMEOUT` | 300000 | Таймаут генерации (мс) |
| `MAX_CONCURRENT_GENERATIONS` | 3 | Кол-во параллельных генераций |
| `KEEP_REPORTS_COUNT` | 10 | Кол-во хранимых отчетов на проект |
| `MAX_UPLOAD_FILES_SIZE` | 52428800 | Макс. размер файла (байт) |
| `MAX_UPLOAD_FILES_COUNT` | 500 | Макс. кол-во файлов при пофайловой загрузке |
| `MAX_UPLOAD_ZIP_SIZE` | 104857600 | Макс. размер ZIP (байт) |
| `MAX_JSON_SIZE` | 209715200 | Макс. размер JSON тела (байт) |

## API Endpoints

### Системные

- `GET /health` - проверка здоровья
- `GET /allure-version` - версия Allure CLI
- `GET /` - корневой (HTML или JSON)
- `GET /api/docs` - Swagger UI

### Проекты

- `POST /api/projects` - создание проекта
- `GET /api/projects` - список проектов
- `GET /api/projects/:id` - детали проекта
- `DELETE /api/projects/:id` - удаление проекта
- `POST /api/projects/:id/results` - пофайловая загрузка с автоматической генерацией
- `POST /api/projects/:id/results/zip` - загрузка ZIP с автоматической генерацией
- `POST /api/projects/:id/send-results` - загрузка JSON+base64 с автоматической генерацией
- `GET /api/projects/:id/results` - список результатов
- `GET /api/projects/:id/results/:resultId` - детали результата
- `GET /api/projects/:id/reports` - список отчетов
- `GET /api/projects/:id/reports/latest` - получение последнего отчета
- `DELETE /api/projects/:id/reports/:resultId` - удаление отчета

### Генерация

- `POST /api/generation/generate/:projectId` - запуск ручной генерации
- `GET /api/generation/tasks/:taskId` - статус задачи
- `GET /api/generation/tasks` - все задачи

### Экспорт

- `GET /api/export/report/:projectId/:resultId` - ZIP с отчетом
- `GET /api/export/results/:projectId/:resultId` - ZIP с результатами
- `GET /api/export/info/:projectId/:resultId` - информация об отчете

### Отчеты

- `GET /reports/:projectId/:resultId` - отчет по resultId
- `GET /reports/:projectId/:resultId/*` - файлы отчета
- `GET /reports/:projectId/latest` - последний отчет
- `GET /reports/:projectId/latest/*` - файлы последнего отчета
- `GET /reports/:projectId/awesome-by-behavior/*` - редирект на отчет по поведению
- `GET /reports/:projectId/awesome-by-suite/*` - редирект на отчет по наборам
- `GET /reports/:projectId/dashboard/*` - редирект на дашборд

## Web интерфейс

- Главная: `/` - список проектов
- Проект: `/project.html?id={projectId}` - управление
- Swagger UI: `/api/docs` - интерактивная документация API

## Структура данных

data/
└── projects/
    └── {projectId}/
        ├── metadata.json      # метаданные проекта
        ├── results/
        │   └── {resultId}/    # загруженные результаты
        ├── reports/
        │   ├── {resultId}/    # сгенерированный отчет
        │   └── latest.json    # ссылка на последний отчет
        └── history/
            └── history.jsonl   # история для отчетов

## Примеры

```bash
# Создание проекта
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"id":"my-project","name":"My Project"}'

# Загрузка результатов
curl -X POST http://localhost:3000/api/projects/my-project/results \
  -F "files=@result.json"

# Загрузка ZIP
curl -X POST http://localhost:3000/api/projects/my-project/results/zip \
  -F "file=@allure-results.zip"

# Получение отчета
curl -X GET http://localhost:3000/api/export/report/my-project/{resultId} \
  -o report.zip

# Проверка статуса задачи
curl -X GET http://localhost:3000/api/generation/tasks/{taskId}
```

## Лицензия

MIT
