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
  const [step, setStep] = useState(1); // 1: Select, 2: Loading, 3: QRCode
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isDonationOpen) {
      document.body.style.overflow = 'hidden';
      setStep(1);
      setCopied(false);
      setSelectedValue(10);
      setCustomValue('');
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

  const handleGenerate = () => {
    const val = getCurrentValue();
    if (val < 5) {
      alert("O valor mínimo para doação é R$ 5,00. Muito obrigado pela intenção! ❤️");
      return;
    }
    
    setStep(2);
    // Fake API call
    setTimeout(() => {
      setStep(3);
    }, 1500);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText("00020126580014br.gov.bcb.pix0136marvel-flix-fake-qrcode-code5204000053039865802BR5922Julio Moreira6009Sao Paulo62070503***6304ABCD");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            Os servidores e a CDN Cloudflare têm custos mensais. 
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

          {step === 3 && (
            <div className={styles.step3}>
              <h3>Pronto! Leia ou Copie o Código</h3>
              <div className={styles.qrPlaceholder}>
                <FaQrcode />
                <span>Simulação de QR Code MercadoPago</span>
              </div>
              <div className={styles.totalAmount}>
                Total: <span>R$ {getCurrentValue()},00</span>
              </div>
              
              <button className={`${styles.copyBtn} ${copied ? styles.copied : ''}`} onClick={handleCopy}>
                {copied ? <><FaCheckCircle /> Código Copiado!</> : <><FaCopy /> Copiar Pix (Copia e Cola)</>}
              </button>

              <div className={styles.footerNote}>
                Assim que o pagamento for processado, você receberá um agradecimento! (Em breve)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonationModal;
