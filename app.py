import streamlit as st
import pandas as pd

st.title("Volerex Data Extraction")

uploaded_file = st.file_uploader("Last opp Excel- eller CSV-fil", type=["csv", "xlsx"])

if uploaded_file:
    if uploaded_file.name.endswith('.csv'):
        df = pd.read_csv(uploaded_file)
    else:
        df = pd.read_excel(uploaded_file)

    st.subheader("Forhåndsvisning av data:")
    st.write(df)

