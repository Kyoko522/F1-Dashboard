# ============================================
# IN openf1.py
# ============================================

def get_SOMETHING(self, required_param, optional_param=None):
    """
    Docstring explaining what this does
    """
    # Build params dict
    params = {"required": required_param}
    if optional_param:
        params["optional"] = optional_param
    
    # Make request
    return self._make_request("/endpoint", params=params)


# ============================================
# IN main.py
# ============================================

@app.get("/api/something")
async def get_something(required_param: int, optional_param: Optional[str] = None):
    """
    Docstring explaining the endpoint
    """
    try:
        # Call the client method
        data = openf1_client.get_SOMETHING(required_param, optional_param)
        
        # Check for failure
        if data is None:
            raise HTTPException(status_code=503, detail="API failed")
        
        # Return formatted response
        return {
            "success": True,
            "count": len(data),
            "data": data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))