# Step 1: Use an official Python runtime as a parent image
FROM python:3.10

# Step 2: Set environment variables to prevent Python from buffering stdout and stdin
ENV PYTHONUNBUFFERED=1

# Step 3: Set the working directory in the container
WORKDIR /nba_predictions

# Step 4: Copy the requirements file into the container
COPY requirements.txt /nba_predictions/

# Step 5: Install any necessary dependencies
RUN pip install --upgrade pip \
    && pip install -r requirements.txt
RUN python manage.py collectstatic --noinput

# Step 6: Copy the application code into the container at /nba_predictions
COPY . /nba_predictions/

# Step 7: Set environment variables for Django (optional)
# Replace `nba_predictions.settings` with your actual settings path if different
ENV DJANGO_SETTINGS_MODULE=nba_predictions.settings

# Step 8: Expose the port that your app runs on (if needed for local testing)
EXPOSE 8000

# Step 9: Run the Django app using Gunicorn for production
CMD ["gunicorn", "nba_predictions.wsgi:application", "--bind", "0.0.0.0:8000"]