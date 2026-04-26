from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.database import get_db, Panel
from models.schemas import PanelCreate, PanelOut

router = APIRouter(prefix="/panels", tags=["panels"])


@router.post("/", response_model=PanelOut, status_code=201)
def create_panel(panel: PanelCreate, db: Session = Depends(get_db)):
    db_panel = Panel(**panel.model_dump())
    db.add(db_panel)
    db.commit()
    db.refresh(db_panel)
    return db_panel


@router.get("/", response_model=list[PanelOut])
def list_panels(db: Session = Depends(get_db)):
    return db.query(Panel).all()


@router.get("/{panel_id}", response_model=PanelOut)
def get_panel(panel_id: int, db: Session = Depends(get_db)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    return panel


@router.delete("/{panel_id}", status_code=204)
def delete_panel(panel_id: int, db: Session = Depends(get_db)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    db.delete(panel)
    db.commit()
