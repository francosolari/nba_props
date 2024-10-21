from django import forms
from .models import Question, RegularSeasonStandings,Team,Answer, User


class PositionPredictionForm(forms.ModelForm):
    team = forms.ModelChoiceField(queryset=Team.objects.all(),
                                  empty_label="Select Team",
                                  widget=forms.Select(attrs={'class': 'select2'})
                                  )
    predicted_position = forms.IntegerField(min_value=1, max_value=30, required=True, label="Predicted Position")

    class Meta:
        model = RegularSeasonStandings
        fields = ['team', 'predicted_position']


class QuestionForm(forms.ModelForm):
    class Meta:
        model = Answer
        fields = ['question', 'answer']
        widgets = {
            'question': forms.HiddenInput(),
        }

class UserProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['username', 'email']
