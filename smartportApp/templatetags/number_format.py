from django import template

register = template.Library()

@register.filter
def currency(value):
  """Format number as currency with commas and 2 decimal places"""
  try:
    return f"₱{value:,.2f}"
  except (ValueError, TypeError):
    return "₱0.00"

@register.filter  
def weight_format(value):
  """Format weight with commas and 2 decimal places"""
  try:
    return f"{value:,.2f}"
  except (ValueError, TypeError):
    return "0.00"

@register.filter
def quantity_format(value):
  """Format quantity with commas (no decimal places)"""
  try:
    return f"{value:,}"
  except (ValueError, TypeError):
    return "0"