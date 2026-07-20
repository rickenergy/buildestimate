# Blueprint Takeoff — Plano (assistido, GC no controle)

> Visão do dono: sobe planta → sistema identifica trades → GC escolhe → takeoff.
> **Realidade honesta:** takeoff 100% autônomo com 99% de acerto NÃO é factível hoje
> (nem Togal.ai/Kreo entregam isso). O que ganha: **IA faz o 1º passe, GC valida.**
> O app já vive esse princípio — "AI never invents your numbers".

## O que é realista vs armadilha

| Realista (fazer) | Armadilha (não prometer) |
|---|---|
| IA lê a planta e **sugere** trades presentes | "detecta 100% dos trabalhos sozinha" |
| IA **estima** áreas/quantidades como rascunho | "quantidade exata garantida" |
| GC **confirma escala** (1 medida conhecida) | "lê a escala sozinha sempre" |
| GC ajusta/aprova antes de virar estimate | takeoff que vira orçamento sem revisão |
| Perguntas por trade (reusa o cascade advisor) | adivinhar requisitos sem perguntar |

**Escala é o calcanhar de Aquiles:** planta sem escala calibrada = quantidade errada.
Solução: o GC marca **uma medida conhecida** (ex.: uma parede de 10 ft) → o sistema
calibra tudo a partir dela. Isso sobe o acerto de "chute" para "confiável".

## Fluxo (produto)
1. **Submenu "Blueprints / Plantas"** → sobe PDF/imagem da planta.
2. **IA lê** → lista os **trades disponíveis** que reconheceu (flooring, drywall, paint, tile…).
3. GC **escolhe o trade** pra fazer o takeoff.
4. GC **calibra a escala** (marca 1 medida conhecida) — 10 segundos, destrava precisão.
5. IA **sugere as áreas de trabalho** + quantidades (rascunho) → GC ajusta/aprova.
6. Vira **estimate** (motor determinístico existente) + perguntas do trade (cascade advisor).
7. Daí pra frente: **gestão de projeto** (já temos — tasks, gantt, finance, subs).

## Faseamento (cada fase = entregável testável)

**Fase 1 — Fundação (submenu + upload + detecção de trades)** ⭐ próximo
- Tabela `blueprints` + bucket (reusa `photos`).
- Submenu `/blueprints` (lista + upload PDF/imagem).
- Action IA `analyzeBlueprint`: lê a planta (visão) → retorna trades reconhecidos +
  descrição do escopo visível. **Só sugere**, com disclaimer.
- UI: sobe planta → mostra "Trades encontrados" → GC escolhe.

**Fase 2 — Calibração de escala + áreas**
- GC marca uma medida conhecida na imagem (canvas) → fator de escala.
- IA sugere áreas por trade; GC ajusta polígonos/valores.

**Fase 3 — Vira estimate + gestão**
- Quantidades aprovadas → `calculate_estimate` (motor determinístico) → estimate.
- Liga no fluxo de projeto/tasks/finance que já existe.

**Fase 4 — Refino de precisão**
- Aprende com correções do GC (feedback loop, como o catálogo de preços já faz).
- Métricas de acerto por trade.

## Posicionamento (marketing)
Nunca "99% automático". Sempre: **"A IA faz o trabalho chato do primeiro passe;
você confirma em minutos."** Honesto, entregável, e é o valor real (economiza horas).
A precisão sobe com o uso — e o GC nunca é surpreendido por um número errado.
