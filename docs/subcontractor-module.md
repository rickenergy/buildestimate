# Módulo Subcontractor — ContractorOS AI

> Estrutura do módulo de subcontratados: perfil de acesso, contratação (compliance
> EUA), submenu com ficha de cada sub, e score/ranking para priorizar contratações.
> Proposta para validação. Data: 2026-07-18.

## Por que importa
Muitas empresas de construção estão trocando funcionário CLT por subcontratado. O
módulo trata o sub como um **parceiro recorrente** com histórico, documentos e nota —
não só um contato.

---

## 1. Perfil Subcontractor (com login)

O sub loga e vê **só os projetos onde foi contratado**:
- **Escopo dele** (o que foi atribuído), tarefas e cronograma da parte dele.
- **Barra de progresso** do trabalho dele (0→100%) + status de contratação.
- **Financeiro: só o que ELE recebe** — valor do contrato dele, o que já foi pago,
  o que falta, retenção (retainage). **Nunca** vê o total do job, margem ou o que o
  cliente paga.
- Safety checklist da parte dele. Fotos de prova.
- **Não** vê: outros subs, custo total, clientes, propostas, outros projetos.

## 2. Contratação de subcontractor — compliance EUA

Documentos/regras que empresas exigem para contratar um sub na construção civil nos EUA.
Cada sub tem um **checklist de onboarding** (verde quando completo):

| Documento / regra | O que é | Bloqueia contratação? |
|---|---|---|
| **W-9** | Tax ID (EIN/SSN) para emitir 1099 no fim do ano | Sim |
| **COI (Certificate of Insurance)** | Comprova General Liability + Workers' Comp vigentes, com sua empresa como *additional insured* | Sim |
| **Contractor License** | Licença do trade/estado (quando o estado exige) | Depende do trade |
| **Subcontractor Agreement** | Contrato: escopo, valor, prazo, forma de pagamento, retainage, garantia, indenização, resolução de disputa | Sim |
| **Lien Waiver** | Renúncia de gravame — condicional/incondicional, parcial (por medição) e final | No pagamento |
| **Business entity** | LLC/EIN, comprovante de empresa ativa | Recomendado |
| **OSHA / Safety** | Treinamento/《compliance》de segurança | Recomendado |
| **Bond** | Garantia (surety bond) — só em obras maiores/públicas | Depende |
| **Schedule of Values** | Cronograma de pagamento por etapa (%) | Sim |

**Formato de contratação** (escolhe por sub/por job):
- **Lump sum** (valor fechado) · **Unit price** (por unidade) · **Time & materials** (hora+material).
- **Retainage** (retenção, ex: 10% liberado no fim) · **Progress payments** por medição.

Contrato gerado por template + assinatura (reusa o fluxo de assinatura/DocuSign-like que
já existe na proposta pública).

## 3. Submenu "Subcontractors"

Lista de todos os subs cadastrados (card por empresa): nome da empresa, dono, trade,
**score**, status dos documentos (🟢/🔴), nº de jobs. Clicar → **ficha do sub**.

### Ficha do subcontratado
- **Cabeçalho:** empresa, dono, trade, contato (tel/whatsapp/email/maps), score + selo de ranking.
- **Documentos:** checklist de compliance (seção 2) com validade (COI/licença vencendo = alerta).
- **Histórico de trabalhos** (tabela): projeto · escopo · valor cobrado · início/fim ·
  **entregou no prazo?** · incidentes · retrabalho · avaliação.
- **Financeiro com ele:** total pago histórico, ticket médio, último valor cobrado.
- **Observações/flags:** problemas relatados, disputas.

## 4. Score & Ranking (priorizar quem contratar)

Score 0–100 composto por métricas objetivas do histórico:

| Métrica | Peso | Fonte |
|---|--:|---|
| **On-time delivery** (% entregue no prazo) | 25% | datas planejadas vs reais |
| **Budget adherence** (ficou no valor combinado) | 20% | valor contratado vs pago |
| **Qualidade / retrabalho** (menos rework = melhor) | 20% | flag de retrabalho por job |
| **Segurança** (incidentes) | 15% | `incidents` ligados ao sub |
| **Compliance de documentos** (COI/licença válidos) | 10% | checklist seção 2 |
| **Responsividade** (aceita/responde rápido os shares) | 5% | `estimate_shares` (tempo de resposta) |
| **Recontratação** (você já o chamou de novo) | 5% | nº de jobs recorrentes |

- **Ranking** ordena os subs por score dentro de cada trade → na hora de compartilhar um
  estimate (feature que já existe), o sistema **sugere os melhores primeiro**.
- **Selos:** 🥇 Top / 🟢 Confiável / 🟡 Atenção / 🔴 Risco (doc vencido ou incidente grave).

## 5. Faseamento sugerido

1. **Ficha + histórico** (usa dados que já existem: `estimate_shares`, jobs, incidentes).
2. **Checklist de compliance** (novos campos/tabela `subcontractor_docs`).
3. **Score + ranking** (deriva do histórico) → integra na sugestão do "compartilhar com subs".
4. **Perfil/login do sub** + barra de progresso + financeiro-dele (depende do épico de roles).
5. **Contrato + assinatura** (reusa fluxo de aceite).

> Estruturado. Diga se o score/pesos batem com o que você valoriza num sub e por qual
> fase começamos.
