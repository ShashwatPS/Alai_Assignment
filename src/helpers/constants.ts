export const getCreatedAt = () => {
    const date = new Date();
    const iso = date.toISOString(); 
    const micro = String(date.getMilliseconds()).padStart(3, '0') + '000'; 
    return iso.replace(/\.(\d+)Z/, `.${micro}+00:00`);
  };

export const Instructions  = "Start the presentation with a brief introduction that clearly explains what the product or website is and why it matters. Follow that with a slide highlighting its key features or benefits—what makes it unique or valuable. Next, describe how it works by breaking down the user journey or core workflow in simple steps. Then, showcase the target audience or common use cases to demonstrate who it’s built for and how it provides value. Finally, end with a compelling vision or future outlook, emphasizing the long-term goals or the broader mission behind the product to leave a lasting impression."
