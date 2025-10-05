import os
from PIL import Image
import xml.etree.ElementTree as ET
from pathlib import Path

class TIFFToDeepZoom:
    def __init__(self, tile_size=254, tile_overlap=1, tile_format="jpg"):
        """
        Initialize the TIFF to Deep Zoom converter.
        
        Args:
            tile_size: Size of tiles (default 254)
            tile_overlap: Overlap between tiles (default 1)
            tile_format: Output format for tiles ('jpg' or 'png')
        """
        self.tile_size = tile_size
        self.tile_overlap = tile_overlap
        self.tile_format = tile_format
        
    def convert(self, input_path, output_dir):
        """
        Convert TIFF image to Deep Zoom format.
        
        Args:
            input_path: Path to input TIFF file
            output_dir: Directory where output files will be saved
        """
        print(f"Loading image: {input_path}")
        img = Image.open(input_path)
        
        # Convert to RGB if necessary
        if img.mode not in ('RGB', 'RGBA'):
            img = img.convert('RGB')
        
        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Get image dimensions
        width, height = img.size
        print(f"Image size: {width}x{height}")
        
        # Calculate number of levels
        max_dimension = max(width, height)
        num_levels = 6
        # temp = max_dimension
        # while temp > self.tile_size:
        #     temp = temp / 2
        #     num_levels += 1
        # num_levels += 1
        
        print(f"Generating {num_levels} zoom levels...")
        
        # Create tiles directory
        tiles_dir = output_path / f"{output_path.name}_files"
        tiles_dir.mkdir(exist_ok=True)
        
        # Generate tiles for each level
        for level in range(num_levels):
            level_num = num_levels - level - 1
            scale = 2 ** level_num
            
            # Calculate scaled dimensions
            scaled_width = width // scale
            scaled_height = height // scale
            
            if scaled_width == 0:
                scaled_width = 1
            if scaled_height == 0:
                scaled_height = 1
            
            print(f"Level {level}: {scaled_width}x{scaled_height}")
            
            # Resize image for this level
            level_img = img.resize((scaled_width, scaled_height), Image.Resampling.LANCZOS)
            
            # Create level directory
            level_dir = tiles_dir / str(level)
            level_dir.mkdir(exist_ok=True)
            
            # Calculate number of tiles needed
            cols = (scaled_width + self.tile_size - 1) // self.tile_size
            rows = (scaled_height + self.tile_size - 1) // self.tile_size
            
            # Generate tiles
            for row in range(rows):
                for col in range(cols):
                    # Calculate tile boundaries
                    x = col * self.tile_size
                    y = row * self.tile_size
                    w = min(self.tile_size, scaled_width - x)
                    h = min(self.tile_size, scaled_height - y)
                    
                    # Crop tile
                    tile = level_img.crop((x, y, x + w, y + h))
                    
                    # Save tile
                    tile_filename = f"{col}_{row}.{self.tile_format}"
                    tile_path = level_dir / tile_filename
                    
                    if self.tile_format == "jpg":
                        tile.save(tile_path, "JPEG", quality=85)
                    else:
                        tile.save(tile_path, "PNG")
        
        # Create DZI descriptor file
        self._create_dzi_file(output_path, width, height)
        
        print(f"\nConversion complete!")
        print(f"DZI file: {output_path / f'{output_path.name}.dzi'}")
        print(f"Tiles directory: {tiles_dir}")
        
    def _create_dzi_file(self, output_path, width, height):
        """Create the .dzi XML descriptor file."""
        root = ET.Element("Image", {
            "TileSize": str(self.tile_size),
            "Overlap": str(self.tile_overlap),
            "Format": self.tile_format,
            "xmlns": "http://schemas.microsoft.com/deepzoom/2008"
        })
        
        size = ET.SubElement(root, "Size", {
            "Width": str(width),
            "Height": str(height)
        })
        
        tree = ET.ElementTree(root)
        dzi_path = output_path / f"{output_path.name}.dzi"
        tree.write(dzi_path, encoding="utf-8", xml_declaration=True)


def main():
    print("=" * 50)
    print("TIFF to OpenSeadragon Converter")
    print("=" * 50)
    print()
    
    # Get input file
    input_file = input("Enter path to TIFF file: ").strip()
    
    if not os.path.exists(input_file):
        print(f"Error: File '{input_file}' not found!")
        return
    
    # Get output directory
    default_output = os.path.splitext(os.path.basename(input_file))[0]
    output_dir = input(f"Enter output directory name (default: '{default_output}'): ").strip()
    
    if not output_dir:
        output_dir = default_output
    
    # Get tile format
    tile_format = input("Enter tile format (jpg/png, default: jpg): ").strip().lower()
    if tile_format not in ['jpg', 'png']:
        tile_format = 'jpg'
    
    # Create converter and convert
    converter = TIFFToDeepZoom(tile_format=tile_format)
    
    try:
        converter.convert(input_file, output_dir)
        print("\n" + "=" * 50)
        print("SUCCESS!")
        print("=" * 50)
        print("\nTo use with OpenSeadragon, add this to your HTML:")
        print(f"""
<div id="openseadragon" style="width: 800px; height: 600px;"></div>
<script src="https://cdn.jsdelivr.net/npm/openseadragon@latest/build/openseadragon/openseadragon.min.js"></script>
<script>
    var viewer = OpenSeadragon({{
        id: "openseadragon",
        prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@latest/build/openseadragon/images/",
        tileSources: "{output_dir}/{output_dir}.dzi"
    }});
</script>
        """)
    except Exception as e:
        print(f"\nError during conversion: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()