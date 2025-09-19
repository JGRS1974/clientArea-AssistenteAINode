const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class TemplateService {
    constructor() {
        this.compiledTemplates = new Map();
        this.templatesPath = path.join(__dirname, '../templates');
    }

    async loadTemplate(templateName) {
        if (this.compiledTemplates.has(templateName)) {
            return this.compiledTemplates.get(templateName);
        }

        try {
            const templatePath = path.join(this.templatesPath, `${templateName}.hbs`);
            const templateContent = await fs.readFile(templatePath, 'utf8');
            const compiled = handlebars.compile(templateContent);
        
            this.compiledTemplates.set(templateName, compiled);
            return compiled;
        } catch (error) {
            console.error(`Erro ao carregar template ${templateName}:`, error);
            throw new Error(`Template ${templateName} não encontrado`);
        }
    }

    async renderSystemPrompt(kw, statusLogin, options = {}) {

        const now = new Date();

        // converte a hora local de São Paulo
        const utp_options = { timeZone: 'America/Sao_Paulo' };
        const local = new Date(now.toLocaleString('en-US', utp_options));

        const pad = (n) => n.toString().padStart(2, '0');

        const dataFormatted = 
          `${pad(local.getDate())}/${pad(local.getMonth() + 1)}/${local.getFullYear()} ` +
          `${pad(local.getHours())}:${pad(local.getMinutes())}:${pad(local.getSeconds())}`;

        //console.log(formatted); // 16/09/2025 14:35:42

        const template = await this.loadTemplate('system-prompt');
        
        const defaultData = {
            kw,
            statusLogin,
            dataFormatted
        };
        const rendered = template({ ...defaultData, ...options });

        //console.log("=== VARIÁVEIS ===", { kw, statusLogin, ...options });
        //console.log("=== PROMPT FINAL ===\n", rendered);

        return rendered;
    }

    async renderTemplate(templateName, data) {
        const template = await this.loadTemplate(templateName);
        return template(data);
    }

    // Método para recarregar templates em desenvolvimento
    clearCache() {
        this.compiledTemplates.clear();
    }

}

module.exports = new TemplateService();