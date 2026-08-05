import React, { useState, useEffect } from 'react';
import { FaTimes, FaHeart, FaQrcode, FaCopy, FaCheckCircle, FaChevronRight } from 'react-icons/fa';
import anime from 'animejs';
import useUIStore from '../../store/uiStore';
import styles from './DonationModal.module.css';

const presetValues = [5, 10, 15, 20, 25];

const DonationModal = () => {
  const { isDonationOpen, closeDonation } = useUIStore();
  const [selectedValue, setSelectedValue] = useState(10);
  const [customValue, setCustomValue] = useState('');
  const [step, setStep] = useState(1); // 1: Select, 2: Loading, 3: QRCode, 4: Success
  const [copied, setCopied] = useState(false);
  
  // Real PIX data from Backend
  const [paymentData, setPaymentData] = useState(null);

  // Reset state on open
  useEffect(() => {
    if (isDonationOpen) {
      document.body.style.overflow = 'hidden';
      setStep(1);
      setCopied(false);
      setSelectedValue(10);
      setCustomValue('');
      setPaymentData(null);
      anime({
        targets: `.${styles.overlay}`,
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutQuad',
      });
      anime({
        targets: `.${styles.modal}`,
        translateY: [30, 0],
        opacity: [0, 1],
        duration: 400,
        delay: 100,
        easing: 'easeOutQuart',
      });
    } else {
      document.body.style.overflow = '';
    }
  }, [isDonationOpen]);

  // Polling for payment status
  useEffect(() => {
    let interval;
    if (isDonationOpen && step === 3 && paymentData?.id) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/pix/status/${paymentData.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'approved') {
              setStep(4);
              clearInterval(interval);
            }
          }
        } catch (err) {
          console.error("Erro ao checar status do Pix:", err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isDonationOpen, step, paymentData]);

  if (!isDonationOpen) return null;

  const handleClose = () => {
    anime({
      targets: `.${styles.overlay}`,
      opacity: [1, 0],
      duration: 250,
      easing: 'easeInQuad',
      complete: closeDonation
    });
  };

  const handleCustomChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    setCustomValue(val);
    setSelectedValue(null);
  };

  const getCurrentValue = () => {
    if (selectedValue) return selectedValue;
    if (customValue) return parseInt(customValue, 10);
    return 0;
  };

  const handleGenerate = async () => {
    const val = getCurrentValue();
    if (val < 5) {
      alert("O valor mínimo para doação é R$ 5,00. Muito obrigado pela intenção! ❤️");
      return;
    }
    
    setStep(2);
    
    try {
      const res = await fetch('/api/pix/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: val })
      });
      
      if (!res.ok) throw new Error('Falha ao gerar o Pix');
      const data = await res.json();
      
      setPaymentData(data);
      setStep(3);
    } catch (err) {
      console.error(err);
      alert("Houve um erro ao tentar gerar o Pix. Tente novamente mais tarde.");
      setStep(1);
    }
  };

  const handleCopy = () => {
    if (paymentData?.qr_code) {
      navigator.clipboard.writeText(paymentData.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={handleClose}><FaTimes /></button>
        
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <FaHeart className={styles.heartIcon} />
          </div>
          <h2>Apoie o Projeto</h2>
          <p>
            O MarvelFlix é mantido com carinho para a comunidade. 
            Os servidores têm custos mensais. 
            Se você curte a plataforma, considere apoiar para mantê-la viva e rápida!
          </p>
        </div>

        <div className={styles.content}>
          {step === 1 && (
            <div className={styles.step1}>
              <div className={styles.presets}>
                {presetValues.map(val => (
                  <button 
                    key={val} 
                    className={`${styles.presetBtn} ${selectedValue === val ? styles.active : ''}`}
                    onClick={() => { setSelectedValue(val); setCustomValue(''); }}
                  >
                    R$ {val}
                  </button>
                ))}
              </div>
              
              <div className={styles.customInputWrapper}>
                <span className={styles.currencySymbol}>R$</span>
                <input 
                  type="text" 
                  placeholder="Outro valor (Min. 5)"
                  value={customValue}
                  onChange={handleCustomChange}
                  className={styles.customInput}
                />
              </div>

              <button className={styles.actionBtn} onClick={handleGenerate}>
                Gerar Pix <FaChevronRight />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className={styles.step2}>
              <div className={styles.spinner}></div>
              <p>Conectando ao Mercado Pago...</p>
            </div>
          )}

          {step === 3 && paymentData && (
            <div className={styles.step3}>
              <h3>Pronto! Leia ou Copie o Código</h3>
              <div className={styles.qrContainer} style={{ textAlign: 'center', margin: '16px 0' }}>
                <img 
                  src={`data:image/png;base64,${paymentData.qr_code_base64}`} 
                  alt="QR Code Pix" 
                  style={{ width: '200px', height: '200px', borderRadius: '8px' }} 
                />
              </div>
              <div className={styles.totalAmount}>
                Total: <span>R$ {getCurrentValue()},00</span>
              </div>
              
              <button className={`${styles.copyBtn} ${copied ? styles.copied : ''}`} onClick={handleCopy}>
                {copied ? <><FaCheckCircle /> Código Copiado!</> : <><FaCopy /> Copiar Pix (Copia e Cola)</>}
              </button>

              <div className={styles.footerNote}>
                Aguardando pagamento... Assim que processado, esta tela atualizará automaticamente! ❤️
              </div>
            </div>
          )}

          {step === 4 && (
            <div className={styles.step4} style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ color: '#4caf50', fontSize: '3rem', marginBottom: '10px' }}>
                <FaCheckCircle />
              </div>
              <h3 style={{ marginBottom: '10px' }}>Pagamento Confirmado!</h3>
              <p style={{ color: 'var(--text-lo)', lineHeight: '1.5' }}>
                Muito obrigado pelo seu apoio!<br/>
                Sua doação ajuda imensamente a manter o MarvelFlix online e rápido para todos os fãs.
              </p>
              <button className={styles.actionBtn} onClick={handleClose} style={{ marginTop: '20px' }}>
                Voltar para o Catálogo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonationModal;
