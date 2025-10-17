const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const nanoid = (size = 21) => {
  let id = '';
  const cryptoSource = globalThis as unknown as { crypto?: Crypto; msCrypto?: Crypto };
  const cryptoObj = cryptoSource.crypto ?? cryptoSource.msCrypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const values = new Uint32Array(size);
    cryptoObj.getRandomValues(values);
    for (let i = 0; i < size; i += 1) {
      id += alphabet[values[i] % alphabet.length];
    }
  } else {
    for (let i = 0; i < size; i += 1) {
      id += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }
  return id;
};
