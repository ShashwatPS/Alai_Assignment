interface SlideImage {
    file_path: string;
    url: string;
  }
  
  export interface Slide {
    heading: string | null;
    images_on_slide: SlideImage[] | null;
    slide_context: string | null;
    slide_instructions: string | null;
  }