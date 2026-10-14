# Data policy

This folder must only contain non-sensitive application data.

Client-derived files such as `contacts.json` and `quote-products.json` must live outside the public workspace.

The historical/default shared location is:

`Z:\Adri\Dades MNLSolutions`

For a local workstation without the `Z:` drive, use a private directory such as:

`C:\Users\<user>\Documents\MNLSolutions-private-data`

The application reads the shared folder by default. Override it with `MNL_SENSITIVE_DATA_DIR`. Never commit `.env` files, exported contacts, quotes, invoices, API keys, or temporary customer JSON files.
