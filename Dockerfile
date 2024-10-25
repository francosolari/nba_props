# Step 1: Use an official Python runtime as a parent image
FROM python:3.11-slim-bullseye

# Step 2: Set environment variables to prevent Python from buffering stdout and stdin
ENV PYTHONUNBUFFERED=1

# Step 3: Set the working directory in the container
WORKDIR /nba_predictions

# Step 4: Copy the requirements file into the container
COPY requirements.txt /nba_predictions/

# Step 5: Install any necessary dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Step 6: Copy the application code into the container at /nba_predictions
COPY . /nba_predictions/

# Step 7: Collect static files
RUN python manage.py collectstatic --noinput

# Step 8: Set environment variables for Django (optional)
ENV DJANGO_SETTINGS_MODULE=nba_predictions.settings

# Step 9: Expose the port that your app runs on
EXPOSE 8000

# Step 10: Run the Django app using Gunicorn for production
CMD ["gunicorn", "nba_predictions.wsgi:application", "--bind", "0.0.0.0:8000"]