const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Lê a chave da API guardada no Render
const apiKey = (process.env.GEMINI_API_KEY || '').trim();

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static('public'));

app.post('/compare', async (req, res) => {
    try {
        const { images } = req.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
        }

        const parts = [
            {
                text: `Analise as etiquetas de preço enviadas e determine a opção com melhor custo-benefício (menor preço por kg, litro ou unidade).
Responda de forma direta no seguinte formato (sem asteriscos ou formatação markdown):

Campeão: [Nome do Produto e Peso/Volume]
Preço: R$ [Preço Total] (R$ [Preço por kg/L/unidade]/kg)
Economia: R$ [Diferença] a menos por kg em relação ao produto mais caro.`
            }
        ];

        images.forEach((imgBase64) => {
            const base64Data = imgBase64.includes(',') ? imgBase64.split(',')[1] : imgBase64;
            parts.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Data
                }
            });
        });

        // ALTERAÇÃO: Utiliza o modelo gemini-1.5-pro, que é mais robusto e aceite globalmente
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }] })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Erro da API:', data);
            return res.status(500).json({ 
                error: `[ERRO DA API]: ${data.error?.message || 'Falha na comunicação com a Google'}` 
            });
        }

        const text = data.candidates[0].content.parts[0].text;
        res.json({ analysis: text });

    } catch (error) {
        console.error('Erro interno no servidor:', error);
        res.status(500).json({ error: `[ERRO INTERNO]: ${error.message}` });
    }
});

app.listen(port, () => {
    console.log(`Servidor a correr na porta ${port}`);
});
