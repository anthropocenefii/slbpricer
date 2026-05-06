from django.urls import path
from . import views

urlpatterns = [
    path('', views.index),
    path('api/price', views.price_bond_view),
    path('api/health', views.health),
]
