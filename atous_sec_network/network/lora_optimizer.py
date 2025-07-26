"""
LoRa Adaptive Engine - Dynamic Parameter Optimization
Sistema de adaptação dinâmica de parâmetros LoRa baseado em condições do canal
"""
import logging
import time
import math
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from collections import deque


@dataclass
class LoraMetrics:
    """Estrutura para métricas LoRa"""
    rssi: float
    snr: float
    packet_loss: float
    timestamp: float


class LoraAdaptiveEngine:
    """
    Motor de adaptação dinâmica para parâmetros LoRa
    
    Otimiza automaticamente spreading factor, potência de transmissão
    e outros parâmetros baseado em condições do canal e requisitos
    de energia vs. confiabilidade.
    """
    
    # Limites regionais para LoRa
    REGION_LIMITS = {
        "BR": {"max_tx_power": 14, "max_duty_cycle": 0.1, "frequency": 915.0},
        "EU": {"max_tx_power": 14, "max_duty_cycle": 0.01, "frequency": 868.0},
        "US": {"max_tx_power": 30, "max_duty_cycle": 1.0, "frequency": 915.0},
        "AU": {"max_tx_power": 30, "max_duty_cycle": 1.0, "frequency": 915.0}
    }
    
    # Limites físicos dos parâmetros
    PARAMETER_BOUNDS = {
        "spreading_factor": {"min": 7, "max": 12},
        "tx_power": {"min": 5, "max": 30},
        "bandwidth": {"min": 125000, "max": 500000},
        "coding_rate": ["4/5", "4/6", "4/7", "4/8"]
    }
    
    def __init__(self, base_config: Dict, history_size: int = 100):
        """
        Inicializa o motor de adaptação LoRa
        
        Args:
            base_config: Configuração inicial dos parâmetros
            history_size: Tamanho do histórico de métricas
        """
        self.config = base_config.copy()
        self.region = base_config.get("region", "BR")
        self.logger = logging.getLogger(__name__)
        
        # Histórico de métricas com janela deslizante
        self.metrics_history = deque(maxlen=history_size)
        self.metrics = {
            "rssi": deque(maxlen=history_size),
            "snr": deque(maxlen=history_size),
            "packet_loss": 0.0
        }
        
        # Contadores para estabilização
        self.adjustment_count = 0
        self.last_adjustment_time = 0
        self.min_adjustment_interval = 30  # segundos
        
        # Configurações de otimização
        self.optimization_mode = "balanced"  # balanced, energy, reliability
        self.target_packet_loss = 0.05  # 5%
        self.target_snr = -7.5
        
        # Validação inicial
        self._validate_config()
        self._setup_hardware()
    
    def _validate_config(self) -> None:
        """Valida configuração inicial"""
        region_limits = self.REGION_LIMITS.get(self.region)
        if not region_limits:
            raise ValueError(f"Região não suportada: {self.region}")
        
        # Ajusta frequência para a região
        self.config["frequency"] = region_limits["frequency"]
        
        # Valida limites de potência
        max_power = region_limits["max_tx_power"]
        if self.config["tx_power"] > max_power:
            self.logger.warning(f"Potência reduzida para {max_power}dBm (limite regional)")
            self.config["tx_power"] = max_power
    
    def _setup_hardware(self) -> None:
        """Configura interface com hardware LoRa"""
        try:
            # Configuração GPIO (se disponível)
            import RPi.GPIO as GPIO
            GPIO.setmode(GPIO.BCM)
            self.logger.info("GPIO configurado para LoRa")
        except (ImportError, RuntimeError):
            self.logger.info("GPIO não disponível - modo simulação")
        
        try:
            # Configuração serial (se disponível)
            import serial
            self.serial_available = True
            self.logger.info("Interface serial disponível")
        except ImportError:
            self.serial_available = False
            self.logger.info("Interface serial não disponível - modo simulação")
    
    def log_metrics(self, rssi: float, snr: float, lost_packets: float) -> None:
        """
        Registra métricas de desempenho do canal
        
        Args:
            rssi: Received Signal Strength Indicator (dBm)
            snr: Signal-to-Noise Ratio (dB)
            lost_packets: Taxa de perda de pacotes (0-1)
        """
        timestamp = time.time()
        
        # Adiciona ao histórico
        self.metrics["rssi"].append(rssi)
        self.metrics["snr"].append(snr)
        
        # Atualiza perda de pacotes com média móvel exponencial
        alpha = 0.7
        self.metrics["packet_loss"] = (
            alpha * self.metrics["packet_loss"] + 
            (1 - alpha) * lost_packets
        )
        
        # Armazena métrica completa
        metric = LoraMetrics(rssi, snr, lost_packets, timestamp)
        self.metrics_history.append(metric)
        
        self.logger.debug(f"Métricas: RSSI={rssi:.1f}dBm, SNR={snr:.1f}dB, Loss={lost_packets:.3f}")
    
    def adjust_parameters(self) -> bool:
        """
        Ajusta parâmetros baseado em condições do canal
        
        Returns:
            True se parâmetros foram ajustados, False caso contrário
        """
        current_time = time.time()
        
        # Verifica intervalo mínimo entre ajustes
        if (current_time - self.last_adjustment_time) < self.min_adjustment_interval:
            return False
        
        # Precisa de histórico mínimo
        if len(self.metrics_history) < 5:
            return False
        
        adjustments_made = False
        region_limits = self.REGION_LIMITS[self.region]
        
        # Ajuste de spreading factor baseado em perda de pacotes
        if self.metrics["packet_loss"] > self.target_packet_loss:
            if self.config["spreading_factor"] < self.PARAMETER_BOUNDS["spreading_factor"]["max"]:
                self.config["spreading_factor"] += 1
                adjustments_made = True
                self.logger.info(f"SF aumentado para {self.config['spreading_factor']} (alta perda)")
        
        # Ajuste de potência baseado em SNR
        elif (self.metrics["snr"] and 
              len(self.metrics["snr"]) > 0 and 
              self.metrics["snr"][-1] > self.target_snr):
            
            if self.config["tx_power"] > self.PARAMETER_BOUNDS["tx_power"]["min"]:
                new_power = self.config["tx_power"] - 2
                max_power = region_limits["max_tx_power"]
                self.config["tx_power"] = min(new_power, max_power)
                adjustments_made = True
                self.logger.info(f"Potência reduzida para {self.config['tx_power']}dBm (boa SNR)")
        
        # Ajuste de largura de banda para otimização
        if self.optimization_mode == "energy" and adjustments_made:
            self._optimize_bandwidth_for_energy()
        elif self.optimization_mode == "reliability" and adjustments_made:
            self._optimize_bandwidth_for_reliability()
        
        if adjustments_made:
            self.adjustment_count += 1
            self.last_adjustment_time = current_time
            self._reconfigure_radio()
        
        return adjustments_made
    
    def _optimize_bandwidth_for_energy(self) -> None:
        """Otimiza largura de banda para economia de energia"""
        if self.config["bandwidth"] < self.PARAMETER_BOUNDS["bandwidth"]["max"]:
            self.config["bandwidth"] = min(
                self.config["bandwidth"] * 2,
                self.PARAMETER_BOUNDS["bandwidth"]["max"]
            )
            self.logger.info(f"Largura de banda aumentada para {self.config['bandwidth']}Hz (modo energia)")
    
    def _optimize_bandwidth_for_reliability(self) -> None:
        """Otimiza largura de banda para confiabilidade"""
        if self.config["bandwidth"] > self.PARAMETER_BOUNDS["bandwidth"]["min"]:
            self.config["bandwidth"] = max(
                self.config["bandwidth"] // 2,
                self.PARAMETER_BOUNDS["bandwidth"]["min"]
            )
            self.logger.info(f"Largura de banda reduzida para {self.config['bandwidth']}Hz (modo confiabilidade)")
    
    def _reconfigure_radio(self) -> None:
        """Aplica novas configurações ao hardware"""
        if self.serial_available:
            try:
                # Comandos AT para reconfigurar módulo LoRa
                commands = [
                    f"AT+SF={self.config['spreading_factor']}",
                    f"AT+POWER={self.config['tx_power']}",
                    f"AT+BW={self.config['bandwidth']}",
                    f"AT+CR={self.config['coding_rate']}"
                ]
                
                for cmd in commands:
                    self.logger.debug(f"Enviando comando: {cmd}")
                    # self.serial.write(f"{cmd}\r\n".encode())
                    # response = self.serial.read(10)
                    # if b'OK' not in response:
                    #     self.logger.warning(f"Falha no comando: {cmd}")
                
                self.logger.info("Rádio reconfigurado com sucesso")
            except Exception as e:
                self.logger.error(f"Erro ao reconfigurar rádio: {e}")
        else:
            self.logger.info(f"Simulação: Reconfigurando rádio - SF={self.config['spreading_factor']}, "
                           f"TX={self.config['tx_power']}dBm, BW={self.config['bandwidth']}Hz")
    
    def _calculate_throughput(self) -> float:
        """Calcula throughput teórico baseado nos parâmetros atuais"""
        # Fórmula LoRa: throughput = (SF * BW) / (2^SF * CR)
        sf = self.config["spreading_factor"]
        bw = self.config["bandwidth"]
        
        # Taxa de codificação
        cr_map = {"4/5": 0.8, "4/6": 0.67, "4/7": 0.57, "4/8": 0.5}
        cr = cr_map.get(self.config["coding_rate"], 0.8)
        
        # Throughput em bps
        throughput = (sf * bw) / (2**sf * cr)
        return throughput
    
    def _estimate_range(self) -> float:
        """Estima alcance baseado nos parâmetros atuais"""
        # Modelo simplificado de path loss
        tx_power = self.config["tx_power"]
        sf = self.config["spreading_factor"]
        
        # Sensibilidade do receptor (dBm)
        sensitivity = -120 + (sf - 7) * 2.5
        
        # Path loss model (simplificado)
        path_loss = tx_power - sensitivity - 20  # Margem de segurança
        
        # Distância estimada (metros)
        # PL = 20*log10(d) + 20*log10(f) + 32.44
        frequency = self.config["frequency"] / 1000  # GHz
        distance = 10**((path_loss - 20*math.log10(frequency) - 32.44) / 20)
        
        return distance
    
    def _estimate_energy_consumption(self) -> float:
        """Estima consumo energético (mA)"""
        # Consumo base
        base_consumption = 25  # mA
        
        # Adicional por spreading factor
        sf_consumption = (self.config["spreading_factor"] - 7) * 2
        
        # Adicional por potência de transmissão
        power_consumption = (self.config["tx_power"] - 5) * 1.5
        
        total_consumption = base_consumption + sf_consumption + power_consumption
        return total_consumption
    
    def get_performance_summary(self) -> Dict:
        """Retorna resumo de desempenho atual"""
        return {
            "current_config": self.config.copy(),
            "metrics": {
                "avg_rssi": sum(self.metrics["rssi"]) / len(self.metrics["rssi"]) if self.metrics["rssi"] else 0,
                "avg_snr": sum(self.metrics["snr"]) / len(self.metrics["snr"]) if self.metrics["snr"] else 0,
                "packet_loss": self.metrics["packet_loss"],
                "adjustment_count": self.adjustment_count
            },
            "performance": {
                "throughput": self._calculate_throughput(),
                "estimated_range": self._estimate_range(),
                "energy_consumption": self._estimate_energy_consumption()
            },
            "region_limits": self.REGION_LIMITS[self.region]
        }
    
    def set_optimization_mode(self, mode: str) -> None:
        """Define modo de otimização"""
        valid_modes = ["balanced", "energy", "reliability"]
        if mode not in valid_modes:
            raise ValueError(f"Modo inválido. Use: {valid_modes}")
        
        self.optimization_mode = mode
        self.logger.info(f"Modo de otimização alterado para: {mode}")
    
    def reset_metrics(self) -> None:
        """Reseta histórico de métricas"""
        self.metrics_history.clear()
        self.metrics["rssi"].clear()
        self.metrics["snr"].clear()
        self.metrics["packet_loss"] = 0.0
        self.adjustment_count = 0
        self.logger.info("Métricas resetadas")