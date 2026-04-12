export async function createMongikePayment(phoneNumber: string, email: string) {
  try {
    const response = await fetch('/api/create-mongike-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        email,
        amount: 320 // Updated amount in TZS
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    // Mongike usually returns a redirect URL or a status
    if (data.redirect_url) {
      window.location.href = data.redirect_url;
    } else if (data.status === 'PENDING') {
      // For mobile money, it might just be pending until the user confirms on their phone
      return data;
    }
    
    return data;
  } catch (err: any) {
    console.error('Mongike Payment Error:', err);
    throw err;
  }
}
