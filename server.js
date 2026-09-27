const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 3000;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

app.post('/compare', async (expressReq, res) => {
    try {
        const { images } = expressReq.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
        }

        const imageParts = images.map(imgBase64 => ({
            inlineData: {
                data: imgBase64.replace(/^data:image\/\w+;base64,/, ''),
                mimeType: 'image/jpeg'
            }
        }));

        const promptText = `Analise as etiquetas de preço enviadas e determine a opção com melhor custo-benefício (menor preço por kg, litro ou unidade).
Responda RIGOROSAMENTE no seguinte formato de 3 linhas, sem qualquer texto adicional, sem títulos, sem asteriscos e sem marcações em Markdown:

Campeão: [Nome do Produto e Peso/Volume]
Preço: R$ [Preço Total] (R$ [Preço por kg/L/unidade]/kg)
Economia: R$ [Diferença por kg/L/unidade em relação ao produto mais caro] a menos por kg em relação ao produto mais caro.`;

        // Tenta até 3 vezes em caso de oscilação momentânea da API (erro 503)
        let response;
        let tentativas = 0;
        while (tentativas < 3) {
            try {
                response = await ai.models.generateContent({
                    model: 'gemini-3.8-flash',
                    contents: [promptText, ...imageParts]
                });
                break;
            } catch (err) {
                tentativas++;
                if (tentativas >= 3) throw err;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        res.json({ analysis: response.text });

    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(503).json({ error: 'O serviço está temporariamente sobrecarregado. Por favor, tente novamente.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor a rodar na porta ${port}`);
});
