import React from 'react';
import { FaInstagram } from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer-container">
      <div className="footer-content">
        <p className="footer-disclaimer">
          Este é um site <strong>fan-made</strong> (feito de fãs para fãs) e não possui ligação, afiliação ou patrocínio da Marvel Studios ou da Walt Disney Company.
        </p>
        <p className="footer-copyright">
          © {new Date().getFullYear()} Todos os Direitos Reservados a MarvelFlix
        </p>
        <div className="footer-socials">
          <span className="footer-social-text">Desenvolvido por Júlio Moreira:</span>
          <a href="https://instagram.com/juliomoreirx" target="_blank" rel="noopener noreferrer" className="footer-link">
            <FaInstagram size={18} /> <span>@juliomoreirx</span>
          </a>
          <a href="https://x.com/juliomoreirx" target="_blank" rel="noopener noreferrer" className="footer-link">
            <span style={{fontWeight: 'bold', fontSize: '18px'}}>𝕏</span> <span>@juliomoreirx</span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
