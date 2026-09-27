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

        // Tenta até 3 vezes automaticamente em caso de instabilidade na API (erro 503)
        let response;
        let tentativas = 0;
        while (tentativas < 3) {
            try {
                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [promptText, ...imageParts]
                });
                break;
            } catch (err) {
                tentativas++;
                if (tentativas >= 3) throw err;
                await new Promise(resolve => setTimeout(resolve, 2000)); // Espera 2 segundos antes de tentar de novo
            }
        }

        res.json({ analysis: response.text });

    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(503).json({ error: 'O serviço está temporariamente sobrecarregado. Por favor, tente novamente dentro de instantes.' });
    }
});
