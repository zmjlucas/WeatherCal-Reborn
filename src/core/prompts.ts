import type { WeatherCalContext } from '../types/context';
// Licensed under MIT. See LICENSE.

type PromptValue = string | number | boolean | null | undefined;

/** Text prompts return their editable Alert, action prompts return the chosen index. */
async function generatePrompt(this: WeatherCalContext, title: string, message?: string | null, options?: string[] | null): Promise<number>;
async function generatePrompt(this: WeatherCalContext, title: string, message: string | null | undefined, options: string[] | null | undefined, textvals: PromptValue[], placeholders?: string[]): Promise<Alert>;
async function generatePrompt(this: WeatherCalContext, title: string, message?: string | null, options?: string[] | null, textvals?: PromptValue[], placeholders?: string[]): Promise<number | Alert> {
  const alert = new Alert();
  alert.title = title;
  if (message) alert.message = message;
  for (const button of options ?? ['OK']) alert.addAction(button);
  if (!textvals) return await alert.presentAlert();
  for (const [index, value] of textvals.entries()) {
    alert.addTextField(placeholders?.[index] ?? '', String(value ?? ''));
  }
  if (!options) await alert.present();
  return alert;
}

export default {
  generatePrompt,
  async generateAlert(this: WeatherCalContext, title: string, options?: string[], message?: string): Promise<number> {
    return await this.generatePrompt(title, message, options);
  },
  async promptForText(this: WeatherCalContext, title: string, values: PromptValue[], keys?: string[], message?: string): Promise<Alert> {
    return await this.generatePrompt(title, message, null, values, keys);
  },
};
